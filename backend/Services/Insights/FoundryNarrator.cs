using System.ClientModel;
using System.Diagnostics;
using System.Text.Json;
using Azure.AI.OpenAI;
using Azure.Identity;
using Microsoft.Extensions.Options;
using OpenAI.Chat;
using Touchline.Api.Models;
using Touchline.Api.Models.Insights;

namespace Touchline.Api.Services.Insights;

/// <summary>
/// Foundry / Azure OpenAI tool-calling narrator. Falls through to <see cref="RulesNarrator"/> if unset or on hard failure.
/// </summary>
public sealed class FoundryNarrator(
    InsightTools tools,
    RulesNarrator fallback,
    IOptions<FoundryOptions> options,
    ILogger<FoundryNarrator> logger) : INarrator
{
    public string Name => options.Value.IsConfigured
        ? $"foundry:{options.Value.Model}"
        : fallback.Name;

    public async Task<Narration> NarrateAsync(
        MatchDto match,
        AskRequest request,
        CancellationToken cancellationToken = default)
    {
        var opts = options.Value;
        if (!opts.IsConfigured)
            return await fallback.NarrateAsync(match, request, cancellationToken);

        try
        {
            return await RunFoundryAsync(match, request, opts, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Foundry narration failed; using rules fallback");
            var rules = await fallback.NarrateAsync(match, request, cancellationToken);
            return rules with { Model = $"{rules.Model} (foundry fallback)" };
        }
    }

    async Task<Narration> RunFoundryAsync(
        MatchDto match,
        AskRequest request,
        FoundryOptions opts,
        CancellationToken ct)
    {
        var endpoint = opts.Endpoint.TrimEnd('/');
        // Accept either resource root or .../openai/v1 style; AzureOpenAIClient wants resource root.
        var resource = endpoint
            .Replace("/openai/v1", "", StringComparison.OrdinalIgnoreCase)
            .Replace("/openai", "", StringComparison.OrdinalIgnoreCase)
            .TrimEnd('/');

        AzureOpenAIClient client = string.IsNullOrWhiteSpace(opts.ApiKey)
            ? new AzureOpenAIClient(new Uri(resource), new DefaultAzureCredential())
            : new AzureOpenAIClient(new Uri(resource), new ApiKeyCredential(opts.ApiKey));

        var chat = client.GetChatClient(opts.Model);
        var used = new List<ToolResult>();
        var chatTools = BuildTools();
        var toolClock = new Stopwatch();
        var modelClock = new Stopwatch();
        var modelCalls = 0;
        var inputTokens = 0;
        var outputTokens = 0;

        var home = match.Home?.Name ?? "Home";
        var away = match.Away?.Name ?? "Away";
        var support = (request.Supporting ?? "neutral").Trim().ToLowerInvariant();
        var supportLine = support switch
        {
            "home" => $"Viewer supports {home} (home). Lean coverage toward them without inventing stats.",
            "away" => $"Viewer supports {away} (away). Lean coverage toward them without inventing stats.",
            _ => "Viewer is neutral.",
        };
        var focus = (request.FocusMetric ?? "auto").Trim().ToLowerInvariant();
        var focusLine = focus switch
        {
            "pressing" => "Focus metric: pressing — prefer pressure_window.",
            "shots" => "Focus metric: shots — prefer shot_quality.",
            "possession" => "Focus metric: possession — lean on match_state possession facts.",
            "key_moment" => "Focus metric: key moments — prefer key_moment.",
            _ => "Focus metric: auto — pick tools from the question.",
        };
        var lang = string.IsNullOrWhiteSpace(request.Language) ? "en" : request.Language.Trim();
        var system =
            "You are Touchline Radar's match narrator for a synthetic football feed.\n"
            + $"Teams: {home} (home) vs {away} (away). Mode: {request.Mode}.\n"
            + $"{supportLine}\n{focusLine}\n"
            + $"Write the narrative in locale '{lang}' (same language the viewer picked).\n"
            + "Rules:\n"
            + "- Call tools to get every number. Never invent statistics.\n"
            + "- After tools, reply with ONLY JSON: "
            + "{\"narrative\":\"...\",\"key_evidence_ids\":[\"id\",...],\"in_scope\":true}\n"
            + "- Narrative must quote only numbers that appear in tool facts.\n"
            + "- If the question is outside the feed, call data_limits and set in_scope false.\n"
            + "- Keep narrative under 360 characters. Tone follows mode (casual short / analyst denser).";

        var messages = new List<ChatMessage>
        {
            new SystemChatMessage(system),
            new UserChatMessage(
                $"matchId={request.MatchId}; playIndex={request.PlayIndex}; favoritePlayer={request.FavoritePlayer}; "
                + $"supporting={support}; focusMetric={focus}; language={lang}; windowMinutes={request.WindowMinutes ?? 5}\n"
                + $"Question: {request.Question}"),
        };

        for (var turn = 0; turn < 6; turn++)
        {
            var options = new ChatCompletionOptions
            {
                Temperature = 0.2f,
                MaxOutputTokenCount = 800,
            };
            foreach (var tool in chatTools)
                options.Tools.Add(tool);

            modelClock.Start();
            ChatCompletion completion = await chat.CompleteChatAsync(messages, options, ct);
            modelClock.Stop();
            modelCalls++;
            if (completion.Usage is { } usage)
            {
                inputTokens += usage.InputTokenCount;
                outputTokens += usage.OutputTokenCount;
            }

            if (completion.FinishReason == ChatFinishReason.ToolCalls)
            {
                messages.Add(new AssistantChatMessage(completion));
                toolClock.Start();
                foreach (var call in completion.ToolCalls)
                {
                    var name = call.FunctionName;
                    var args = ParseArgs(call.FunctionArguments);
                    var toolRequest = MergeArgs(request, args);
                    ToolResult result = name == "data_limits"
                        ? await tools.DataLimitsAsync(match, toolRequest, ct)
                        : tools.Run(name, match, toolRequest);
                    used.Add(result);
                    messages.Add(new ToolChatMessage(call.Id, JsonSerializer.Serialize(result)));
                }
                toolClock.Stop();
                continue;
            }

            var text = completion.Content?.FirstOrDefault()?.Text ?? "";
            var parsed = ParseNarrationJson(text);
            if (parsed is null)
            {
                logger.LogWarning("Foundry returned non-JSON; falling back. Raw: {Text}", text);
                return await fallback.NarrateAsync(match, request, ct);
            }

            if (used.Count == 0)
            {
                // Model skipped tools — force match_state so grounding has facts.
                toolClock.Start();
                used.Add(tools.Run("match_state", match, request));
                toolClock.Stop();
            }

            return new Narration(
                parsed.Value.Narrative,
                parsed.Value.Evidence,
                parsed.Value.InScope,
                Name,
                used,
                new NarrationStats(
                    toolClock.ElapsedMilliseconds,
                    modelClock.ElapsedMilliseconds,
                    modelCalls,
                    inputTokens,
                    outputTokens));
        }

        logger.LogWarning("Foundry tool loop exhausted");
        return await fallback.NarrateAsync(match, request, ct);
    }

    static ChatTool[] BuildTools() =>
    [
        ChatTool.CreateFunctionTool("match_state", "Score, minute, phase, possession at playhead."),
        ChatTool.CreateFunctionTool("pressure_window", "Danger share and control/chaos label over last N minutes.",
            BinaryData.FromString("""{"type":"object","properties":{"windowMinutes":{"type":"integer"}}}""")),
        ChatTool.CreateFunctionTool("key_moment", "Why the current incident matters (score delta, salience)."),
        ChatTool.CreateFunctionTool("shot_quality", "Nearest shot outcome and heuristic quality."),
        ChatTool.CreateFunctionTool("player_spotlight", "Tally for favoritePlayer through playhead.",
            BinaryData.FromString("""{"type":"object","properties":{"favoritePlayer":{"type":"string"}}}""")),
        ChatTool.CreateFunctionTool("recap", "HT/FT/live bullet facts and scorers."),
        ChatTool.CreateFunctionTool("data_limits", "What this synthetic feed cannot answer."),
    ];

    static Dictionary<string, JsonElement> ParseArgs(BinaryData data)
    {
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(data.ToString())
                   ?? new Dictionary<string, JsonElement>();
        }
        catch
        {
            return new Dictionary<string, JsonElement>();
        }
    }

    static AskRequest MergeArgs(AskRequest request, Dictionary<string, JsonElement> args) => request with
    {
        WindowMinutes = args.TryGetValue("windowMinutes", out var w) && w.TryGetInt32(out var minutes)
            ? minutes
            : request.WindowMinutes,
        FavoritePlayer = args.TryGetValue("favoritePlayer", out var p) ? p.GetString() : request.FavoritePlayer,
    };

    static (string Narrative, List<string> Evidence, bool InScope)? ParseNarrationJson(string text)
    {
        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        if (start < 0 || end <= start) return null;
        try
        {
            using var doc = JsonDocument.Parse(text[start..(end + 1)]);
            var root = doc.RootElement;
            var narrative = root.TryGetProperty("narrative", out var n) ? n.GetString() ?? "" : "";
            var inScope = !root.TryGetProperty("in_scope", out var s) || s.ValueKind != JsonValueKind.False;
            var evidence = new List<string>();
            if (root.TryGetProperty("key_evidence_ids", out var ids) && ids.ValueKind == JsonValueKind.Array)
            {
                foreach (var id in ids.EnumerateArray())
                {
                    var v = id.GetString();
                    if (!string.IsNullOrEmpty(v)) evidence.Add(v);
                }
            }
            return (narrative, evidence, inScope);
        }
        catch
        {
            return null;
        }
    }
}
