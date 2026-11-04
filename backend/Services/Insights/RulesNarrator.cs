using System.Diagnostics;
using System.Text;
using Touchline.Api.Models;
using Touchline.Api.Models.Insights;

namespace Touchline.Api.Services.Insights;

/// <summary>
/// Offline narrator: picks tools from the question, never invents numbers.
/// Used when Foundry is not configured.
/// </summary>
public sealed class RulesNarrator(InsightTools tools) : INarrator
{
    public string Name => "rules + live tally";

    public async Task<Narration> NarrateAsync(
        MatchDto match,
        AskRequest request,
        CancellationToken cancellationToken = default)
    {
        var q = (request.Question ?? "").ToLowerInvariant();
        var picked = PickTools(q, request);
        var results = new List<ToolResult>();
        var toolClock = Stopwatch.StartNew();
        foreach (var name in picked)
        {
            ToolResult result = name == "data_limits"
                ? await tools.DataLimitsAsync(match, request, cancellationToken)
                : tools.Run(name, match, request);
            results.Add(result);
        }

        var outOfScope = LooksOutOfScope(q);
        if (outOfScope && results.All(r => r.Tool != "data_limits"))
            results.Add(await tools.DataLimitsAsync(match, request, cancellationToken));
        toolClock.Stop();
        var stats = new NarrationStats(toolClock.ElapsedMilliseconds, 0, 0, null, null);

        if (outOfScope)
        {
            var limits = results.First(r => r.Tool == "data_limits");
            var cannot = string.Join(", ", limits.CannotTell.Take(3));
            return new Narration(
                $"That sits outside this synthetic feed ({cannot}). Here is what the playhead can support instead.",
                limits.Facts.Take(3).Select(f => f.Id).ToList(),
                false,
                Name,
                results,
                stats);
        }

        var narrative = BuildNarrative(match, request, results);
        var evidence = results.SelectMany(r => r.Facts).Take(6).Select(f => f.Id).ToList();
        return new Narration(narrative, evidence, true, Name, results, stats);
    }

    static List<string> PickTools(string q, AskRequest request)
    {
        var list = new List<string>();
        void Add(string name)
        {
            if (!list.Contains(name)) list.Add(name);
        }

        // Director focus metric wins when set.
        switch ((request.FocusMetric ?? "auto").Trim().ToLowerInvariant())
        {
            case "pressing":
                Add("pressure_window");
                break;
            case "shots":
                Add("shot_quality");
                break;
            case "possession":
                Add("match_state");
                break;
            case "key_moment":
                Add("key_moment");
                break;
        }

        if (q.Contains("limit") || q.Contains("premier") || q.Contains("predict") || q.Contains("odds") || q.Contains("xg"))
            Add("data_limits");
        if (q.Contains("pressure") || q.Contains("siege") || q.Contains("chaos") || q.Contains("territory") || q.Contains("punch"))
            Add("pressure_window");
        if (q.Contains("shot") || q.Contains("save") || q.Contains("quality") || q.Contains("on target"))
            Add("shot_quality");
        if (q.Contains("recap") || q.Contains("summary") || q.Contains("full time") || q.Contains("ft") || q.Contains("highlight"))
            Add("recap");
        if (q.Contains("player") || q.Contains("dekker") || !string.IsNullOrWhiteSpace(request.FavoritePlayer))
            Add("player_spotlight");
        if (q.Contains("why") || q.Contains("matter") || q.Contains("moment") || q.Contains("goal") || q.Contains("booking") || q.Contains("card"))
            Add("key_moment");

        Add("match_state");
        if (list.Count < 3) Add("pressure_window");
        if (list.Count < 3) Add("key_moment");
        return list.Take(6).ToList();
    }

    static bool LooksOutOfScope(string q) =>
        q.Contains("premier league table")
        || q.Contains("best pl ")
        || q.Contains("odds")
        || q.Contains("betting")
        || q.Contains("next season")
        || q.Contains("transfer");

    static string BuildNarrative(MatchDto match, AskRequest request, List<ToolResult> results)
    {
        var home = match.Home?.Name ?? "Home";
        var away = match.Away?.Name ?? "Away";
        var casual = string.Equals(request.Mode, "casual", StringComparison.OrdinalIgnoreCase);
        var sb = new StringBuilder();
        var lean = SupportingLean(request.Supporting, home, away);
        if (lean is not null) sb.Append(lean);

        var state = results.FirstOrDefault(r => r.Tool == "match_state");
        var pressure = results.FirstOrDefault(r => r.Tool == "pressure_window");
        var key = results.FirstOrDefault(r => r.Tool == "key_moment");
        var shot = results.FirstOrDefault(r => r.Tool == "shot_quality");
        var recap = results.FirstOrDefault(r => r.Tool == "recap");
        var player = results.FirstOrDefault(r => r.Tool == "player_spotlight");

        int? Int(ToolResult? t, string id) =>
            t?.Facts.FirstOrDefault(f => f.Id == id)?.Value is { } v
                ? Convert.ToInt32(v)
                : null;
        string? Str(ToolResult? t, string id) =>
            t?.Facts.FirstOrDefault(f => f.Id == id)?.Value?.ToString();

        var sh = Int(state, "match_state.score.home") ?? 0;
        var sa = Int(state, "match_state.score.away") ?? 0;
        var minute = Int(state, "match_state.minute") ?? 0;
        var dh = Int(pressure, "pressure_window.dangerous_share.home");
        var da = Int(pressure, "pressure_window.dangerous_share.away");
        var label = Str(pressure, "pressure_window.label");
        var focus = (request.FocusMetric ?? "auto").Trim().ToLowerInvariant();

        if (recap is not null && (request.Question ?? "").Contains("recap", StringComparison.OrdinalIgnoreCase))
        {
            var period = Str(recap, "recap.period") ?? "live";
            var goals = Int(recap, "recap.goals_count") ?? 0;
            if (casual)
                sb.Append($"{home} {sh}–{sa} {away} at {period}. {goals} goals so far through {minute}'.");
            else
                sb.Append($"Recap ({period}): {home} {sh}–{sa} {away}. Goals logged: {goals}. Playhead minute {minute}.");
            return sb.ToString();
        }

        if (player is not null && Str(player, "player_spotlight.found") == "True")
        {
            var name = Str(player, "player_spotlight.name");
            var goals = Int(player, "player_spotlight.goals") ?? 0;
            sb.Append($"{name}: {goals} goal(s), {Int(player, "player_spotlight.events")} named events through {minute}'.");
            if (dh is not null) sb.Append($" Danger share sits {dh}–{da} ({label}).");
            return sb.ToString();
        }

        if (focus is "shots" && shot is not null && Str(shot, "shot_quality.outcome") is { } focusShot && focusShot != "none")
        {
            sb.Append($"Shot focus: outcome {focusShot}, quality {Str(shot, "shot_quality.quality")}. On-target {Int(shot, "shot_quality.shots_on.home")}–{Int(shot, "shot_quality.shots_on.away")}.");
            return sb.ToString();
        }

        if (focus is "pressing" && pressure is not null)
        {
            if (casual)
                sb.Append($"Pressing lens at {minute}': danger {dh}–{da} ({label}). Score {home} {sh}–{sa} {away}.");
            else
                sb.Append($"Focus pressing: window danger {dh}–{da} labelled {label}. State {home} {sh}–{sa} {away} at {minute}'.");
            return sb.ToString();
        }

        if (focus is "possession" && state is not null)
        {
            sb.Append($"Possession lens: {Int(state, "match_state.possession.home")}–{Int(state, "match_state.possession.away")} at {minute}' ({home} {sh}–{sa} {away}).");
            return sb.ToString();
        }

        if (key is not null)
        {
            var type = Str(key, "key_moment.type");
            var salience = Int(key, "key_moment.salience") ?? 0;
            var beforeH = Int(key, "key_moment.score_before.home") ?? 0;
            var beforeA = Int(key, "key_moment.score_before.away") ?? 0;
            var afterH = Int(key, "key_moment.score_after.home") ?? 0;
            var afterA = Int(key, "key_moment.score_after.away") ?? 0;
            if (casual)
            {
                sb.Append($"At {minute}', {type} flips the beat — score moves {beforeH}–{beforeA} to {afterH}–{afterA} (salience {salience}).");
            }
            else
            {
                sb.Append($"Key moment type {type} at {minute}'. Score {beforeH}–{beforeA} → {afterH}–{afterA}; salience {salience}; preceding {Str(key, "key_moment.preceding_label")}.");
            }
            if (dh is not null) sb.Append($" Window danger {dh}–{da}.");
            return sb.ToString();
        }

        if (shot is not null && Str(shot, "shot_quality.outcome") is { } outcome && outcome != "none")
        {
            sb.Append($"Nearest shot outcome {outcome}, quality {Str(shot, "shot_quality.quality")}. On-target tally {Int(shot, "shot_quality.shots_on.home")}–{Int(shot, "shot_quality.shots_on.away")}.");
            return sb.ToString();
        }

        if (casual)
            sb.Append($"{home} {sh}–{sa} {away} at {minute}'.");
        else
            sb.Append($"State {home} {sh}–{sa} {away}, minute {minute}, possession {Int(state, "match_state.possession.home")}–{Int(state, "match_state.possession.away")}.");
        if (dh is not null)
            sb.Append($" Last-window danger {dh}–{da} ({label}).");
        return sb.ToString();
    }

    static string? SupportingLean(string? supporting, string home, string away) =>
        (supporting ?? "neutral").Trim().ToLowerInvariant() switch
        {
            "home" => $"For {home}: ",
            "away" => $"For {away}: ",
            _ => null,
        };
}
