using System.Diagnostics;
using Touchline.Api.Models.Insights;

namespace Touchline.Api.Services.Insights;

public sealed class AskService(InsightTools tools, INarrator narrator, ILogger<AskService> logger)
{
    public async Task<AskResponse?> AskAsync(AskRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.MatchId)) return null;
        request.Question = (request.Question ?? "").Trim();
        if (request.Question.Length > 300)
            request.Question = request.Question[..300];
        if (string.IsNullOrEmpty(request.Question))
            request.Question = "What matters at this playhead?";

        var match = await tools.LoadAsync(request.MatchId, ct);
        if (match is null) return null;

        var total = Stopwatch.StartNew();
        var narration = await narrator.NarrateAsync(match, request, ct);

        var groundClock = Stopwatch.StartNew();
        var ground = Grounding.Check(narration.Narrative, request.Question, narration.ToolsUsed);
        groundClock.Stop();
        total.Stop();

        var narrative = ground.Ok ? ground.Narrative : (ground.Notice ?? "");
        if (!ground.Ok)
            logger.LogInformation(
                "Grounding stripped narrative for {MatchId}: token {Token} not in tool facts",
                request.MatchId, ground.Offender);

        var figures = BuildFigures(narration);
        var chart = narration.ToolsUsed
            .Select(t => t.Chart)
            .FirstOrDefault(c => c?.Bars?.Count > 0);
        var caveats = narration.ToolsUsed
            .SelectMany(t => t.Caveats)
            .Distinct()
            .Take(4)
            .ToList();

        return new AskResponse
        {
            Question = request.Question,
            Status = ground.Ok ? "live" : "grounding_fail",
            Grounded = ground.Checked,
            Model = narration.Model,
            Latency = $"{total.ElapsedMilliseconds}ms",
            Narrative = narrative,
            Figures = figures,
            Chart = chart,
            Caveats = caveats,
            InScope = narration.InScope,
            TraceId = Activity.Current?.Id ?? Guid.NewGuid().ToString("N")[..12],
            ToolsUsed = narration.ToolsUsed.Select(t => t.Tool).Distinct().ToList(),
            Stages = new AskStages
            {
                ToolsMs = narration.Stats.ToolMs,
                ModelMs = narration.Stats.ModelMs,
                GroundMs = groundClock.ElapsedMilliseconds,
                TotalMs = total.ElapsedMilliseconds,
            },
            Usage = new AskUsage
            {
                ModelCalls = narration.Stats.ModelCalls,
                InputTokens = narration.Stats.InputTokens,
                OutputTokens = narration.Stats.OutputTokens,
            },
        };
    }

    public async Task<SuggestResponse?> SuggestAsync(SuggestRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.MatchId)) return null;
        var match = await tools.LoadAsync(request.MatchId, ct);
        if (match is null) return null;

        var ctx = new AskRequest { MatchId = request.MatchId, PlayIndex = request.PlayIndex };
        var state = InsightTools.MatchState(match, ctx);
        var key = InsightTools.KeyMoment(match, ctx);
        var pressure = InsightTools.PressureWindow(match, ctx);
        var home = match.Home?.Name ?? "Home";
        var away = match.Away?.Name ?? "Away";

        string Fact(ToolResult t, string id) =>
            t.Facts.FirstOrDefault(f => f.Id == id)?.Value?.ToString() ?? "";

        var minute = Fact(state, "match_state.minute");
        var score = $"{Fact(state, "match_state.score.home")}–{Fact(state, "match_state.score.away")}";
        var type = Fact(key, "key_moment.type");
        var label = Fact(pressure, "pressure_window.label");
        var dh = Fact(pressure, "pressure_window.dangerous_share.home");
        var da = Fact(pressure, "pressure_window.dangerous_share.away");

        var suggestions = new List<SuggestItem>
        {
            new()
            {
                Id = "live-state",
                Prompt = $"What is the live state at {minute}' ({score})?",
                Hint = "match_state · possession",
                ToolBias = "match_state",
            },
            new()
            {
                Id = "pressure",
                Prompt = $"Is the last spell {label}, or just noise? Danger {dh}–{da}.",
                Hint = "pressure_window",
                ToolBias = "pressure_window",
            },
            new()
            {
                Id = "moment",
                Prompt = $"Why does this {type} at {minute}' matter?",
                Hint = "key_moment · salience",
                ToolBias = "key_moment",
            },
            new()
            {
                Id = "shots",
                Prompt = $"How good was the latest {home}/{away} shot attempt?",
                Hint = "shot_quality",
                ToolBias = "shot_quality",
            },
            new()
            {
                Id = "recap",
                Prompt = $"Give me a short recap of {home} vs {away} so far.",
                Hint = "recap",
                ToolBias = "recap",
            },
            new()
            {
                Id = "limits",
                Prompt = "What can this feed not answer?",
                Hint = "data_limits",
                ToolBias = "data_limits",
            },
        };

        // Prefer a named scorer if present near the playhead
        var track = match.Situations;
        var i = PlayCursor.ClampIndex(track, request.PlayIndex);
        for (var n = i; n >= Math.Max(0, i - 40); n--)
        {
            var row = track[n];
            if (PlayCursor.Kind(row) != "goal" || string.IsNullOrWhiteSpace(row.Player)) continue;
            suggestions.Insert(2, new SuggestItem
            {
                Id = "player",
                Prompt = $"What has {row.Player} done through {row.Minute}'?",
                Hint = "player_spotlight",
                ToolBias = "player_spotlight",
            });
            break;
        }

        return new SuggestResponse { Suggestions = suggestions.Take(6).ToList() };
    }

    /// <summary>Up to four facts, the ones the narrator cited first, then tool order.</summary>
    static List<ReceiptFigure> BuildFigures(Narration narration)
    {
        var cited = new HashSet<string>(narration.KeyEvidenceIds, StringComparer.Ordinal);
        return narration.ToolsUsed
            .SelectMany(t => t.Facts)
            .Where(f => f.Value is not null)
            .OrderByDescending(f => cited.Contains(f.Id))
            .Take(4)
            .Select(f => new ReceiptFigure { Value = FormatValue(f), Label = f.Label, Evidence = f.Id })
            .ToList();
    }

    static string FormatValue(ToolFact fact)
    {
        if (fact.Value is double or float)
            return Convert.ToDouble(fact.Value).ToString("0.##") + fact.Unit;
        return $"{fact.Value}{fact.Unit}";
    }
}
