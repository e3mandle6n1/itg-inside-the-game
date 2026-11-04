using Touchline.Api.Models;
using Touchline.Api.Models.Insights;

namespace Touchline.Api.Services.Insights;

public sealed class InsightTools(IMatchStore store)
{
    public async Task<MatchDto?> LoadAsync(string matchId, CancellationToken ct) =>
        await store.GetEnrichedMatchAsync(matchId, ct);

    public ToolResult Run(string tool, MatchDto match, AskRequest ctx) => tool switch
    {
        "match_state" => MatchState(match, ctx),
        "pressure_window" => PressureWindow(match, ctx),
        "key_moment" => KeyMoment(match, ctx),
        "shot_quality" => ShotQuality(match, ctx),
        "player_spotlight" => PlayerSpotlight(match, ctx),
        "recap" => Recap(match, ctx),
        "data_limits" => DataLimits(match, ctx),
        _ => new ToolResult
        {
            Tool = tool,
            Method = "unknown",
            Caveats = ["Unknown tool."],
            CannotTell = ["everything"],
        },
    };

    static ToolFact Fact(string id, string label, object? value, string? unit = null) =>
        new() { Id = id, Label = label, Value = value, Unit = unit };

    public static ToolResult MatchState(MatchDto match, AskRequest ctx)
    {
        var track = match.Situations;
        var i = PlayCursor.ClampIndex(track, ctx.PlayIndex);
        var (h, a) = PlayCursor.ScoreAt(track, i);
        var minute = PlayCursor.MinuteAt(track, i, complete: false);
        var phase = track.Count == 0 ? null : track[i].Phase;
        var (home, away) = PlayCursor.StatsAt(track, i);
        var homePoss = PlayCursor.PossessionPct(home.Possession, away.Possession, true);
        var awayPoss = PlayCursor.PossessionPct(home.Possession, away.Possession, false);

        return new ToolResult
        {
            Tool = "match_state",
            Facts =
            [
                Fact("match_state.score.home", "Home score", h),
                Fact("match_state.score.away", "Away score", a),
                Fact("match_state.minute", "Minute", minute),
                Fact("match_state.phase", "Phase", phase),
                Fact("match_state.possession.home", "Home possession", homePoss, "%"),
                Fact("match_state.possession.away", "Away possession", awayPoss, "%"),
            ],
            Chart = new ToolChart
            {
                Title = "Possession share",
                Bars =
                [
                    new() { Name = match.Home?.Name ?? "Home", A = homePoss, B = 100 - homePoss, ALabel = "Poss", BLabel = "Rest" },
                    new() { Name = match.Away?.Name ?? "Away", A = awayPoss, B = 100 - awayPoss, ALabel = "Poss", BLabel = "Rest" },
                ],
            },
            Method = "scoreAt + phase possession proxy through playIndex",
            Coverage = $"Situations 0..{i} on {ctx.MatchId}",
            Caveats = ["Possession is phase-row share, not Opta possession."],
            CannotTell = ["xG", "pass networks", "player tracking speeds"],
        };
    }

    public static ToolResult PressureWindow(MatchDto match, AskRequest ctx)
    {
        var track = match.Situations;
        var i = PlayCursor.ClampIndex(track, ctx.PlayIndex);
        var window = ctx.WindowMinutes is > 0 and <= 45 ? ctx.WindowMinutes.Value : 5;
        var endMinute = PlayCursor.MinuteAt(track, i, complete: false);
        var startMinute = Math.Max(0, endMinute - window);

        var dH = 0;
        var dA = 0;
        var t = 0;
        for (var n = 0; n <= i; n++)
        {
            var row = track[n];
            if (row.Minute is int m && (m < startMinute || m > endMinute)) continue;
            if (string.IsNullOrEmpty(row.Phase)) continue;
            var kind = PlayCursor.Kind(row);
            if (kind is "periodstart" or "periodscore" or "match_ended" or "kickoff") continue;
            t++;
            if (row.Phase != "dangerous") continue;
            if (row.Team == "home") dH++;
            else if (row.Team == "away") dA++;
        }

        var shareH = t == 0 ? 0 : (int)Math.Round(100.0 * dH / t);
        var shareA = t == 0 ? 0 : (int)Math.Round(100.0 * dA / t);
        string label;
        if (t > 0 && Math.Max(dH, dA) / (double)t >= 0.55)
            label = dH >= dA ? "home_control" : "away_control";
        else if (shareH >= 35 && shareA >= 35)
            label = "chaos";
        else
            label = "contested";

        return new ToolResult
        {
            Tool = "pressure_window",
            Facts =
            [
                Fact("pressure_window.minutes", "Window minutes", window),
                Fact("pressure_window.dangerous_share.home", "Home danger share", shareH, "%"),
                Fact("pressure_window.dangerous_share.away", "Away danger share", shareA, "%"),
                Fact("pressure_window.label", "Pressure label", label),
            ],
            Chart = new ToolChart
            {
                Title = $"Danger share · last {window}'",
                Bars =
                [
                    new() { Name = match.Home?.Name ?? "Home", A = shareH, B = Math.Max(0, 100 - shareH), ALabel = "Danger", BLabel = "Rest" },
                    new() { Name = match.Away?.Name ?? "Away", A = shareA, B = Math.Max(0, 100 - shareA), ALabel = "Danger", BLabel = "Rest" },
                ],
            },
            Method = "dangerous-phase density in minute window",
            Coverage = $"Minutes {startMinute}–{endMinute} through index {i}",
            Caveats = ["Chaos is a label on synthetic phase density, not a physics model."],
            CannotTell = ["xT", "pressing triggers", "PPDA"],
        };
    }

    public static ToolResult KeyMoment(MatchDto match, AskRequest ctx)
    {
        var track = match.Situations;
        var i = PlayCursor.ClampIndex(track, ctx.PlayIndex);
        var row = track.Count == 0 ? null : track[i];
        var kind = row is null ? "" : PlayCursor.Kind(row);
        var (beforeH, beforeA) = i == 0 ? (0, 0) : PlayCursor.ScoreAt(track, i - 1);
        var (afterH, afterA) = PlayCursor.ScoreAt(track, i);
        var pressure = PressureWindow(match, ctx);
        var preceding = pressure.Facts.FirstOrDefault(f => f.Id == "pressure_window.label")?.Value?.ToString() ?? "contested";

        var salience = 0;
        if (kind == "goal") salience += 40;
        else if (kind == "card")
        {
            var colour = row is null ? "" : PlayCursor.CardColour(row);
            salience += colour is "red" or "yellowred" ? 35 : 15;
        }
        else if (kind is "shotontarget" or "shotofftarget" or "shotblocked" or "goalkeeper_saved")
            salience += 20;
        else if (kind is "injury" or "substitution")
            salience += 10;

        if (kind == "goal" && beforeH == 0 && beforeA == 0 && (afterH + afterA) == 1) salience += 25;
        if (kind == "goal")
        {
            var wasLeadHome = beforeH > beforeA;
            var wasLeadAway = beforeA > beforeH;
            var nowLeadHome = afterH > afterA;
            var nowLeadAway = afterA > afterH;
            if ((beforeH == beforeA && (afterH != afterA)) || (wasLeadHome != nowLeadHome) || (wasLeadAway != nowLeadAway))
                salience += 20;
        }
        if (preceding is "chaos" or "away_control" or "home_control")
        {
            if (preceding == "chaos") salience += 10;
            else if (row?.Team == "home" && preceding == "away_control") salience += 10;
            else if (row?.Team == "away" && preceding == "home_control") salience += 10;
        }
        salience = Math.Clamp(salience, 0, 100);

        return new ToolResult
        {
            Tool = "key_moment",
            Facts =
            [
                Fact("key_moment.type", "Incident", string.IsNullOrEmpty(kind) ? "match_action" : kind),
                Fact("key_moment.team", "Team", row?.Team),
                Fact("key_moment.minute", "Minute", row?.Minute ?? PlayCursor.MinuteAt(track, i, false)),
                Fact("key_moment.score_before.home", "Score before home", beforeH),
                Fact("key_moment.score_before.away", "Score before away", beforeA),
                Fact("key_moment.score_after.home", "Score after home", afterH),
                Fact("key_moment.score_after.away", "Score after away", afterA),
                Fact("key_moment.salience", "Salience", salience),
                Fact("key_moment.preceding_label", "Preceding pressure", preceding),
            ],
            Method = "incident + score delta + pressure_window label",
            Coverage = $"Index {i} on {ctx.MatchId}",
            Caveats = ["Salience is a broadcast ranking aid, not win probability."],
            CannotTell = ["VAR state", "xG swing"],
        };
    }

    public static ToolResult ShotQuality(MatchDto match, AskRequest ctx)
    {
        var track = match.Situations;
        var i = PlayCursor.ClampIndex(track, ctx.PlayIndex);
        Situation? shot = null;
        for (var n = i; n >= 0; n--)
        {
            var kind = PlayCursor.Kind(track[n]);
            if (kind is "goal" or "shotontarget" or "shotofftarget" or "shotblocked" or "goalkeeper_saved")
            {
                shot = track[n];
                break;
            }
        }

        var (home, away) = PlayCursor.StatsAt(track, i);
        string outcome = "none";
        double quality = 0;
        string? team = null;
        if (shot is not null)
        {
            team = shot.Team;
            outcome = PlayCursor.Kind(shot) switch
            {
                "goal" => "goal",
                "shotontarget" => "on_target",
                "goalkeeper_saved" => "saved",
                "shotblocked" => "blocked",
                "shotofftarget" => "off_target",
                _ => "none",
            };
            quality = outcome switch
            {
                "goal" => 0.90,
                "on_target" or "saved" => 0.70,
                "blocked" => 0.45,
                "off_target" => 0.25,
                _ => 0,
            };
            // Depth nudge: home attacks +x
            var x = shot.X;
            var attackingDepth = shot.Team == "away" ? 100 - x : x;
            if (attackingDepth >= 85) quality += 0.10;
            else if (attackingDepth >= 70) quality += 0.05;
            else if (attackingDepth < 50) quality -= 0.05;
            quality = Math.Round(Math.Clamp(quality, 0, 1), 2);
        }

        return new ToolResult
        {
            Tool = "shot_quality",
            Facts =
            [
                Fact("shot_quality.outcome", "Outcome", outcome),
                Fact("shot_quality.team", "Team", team),
                Fact("shot_quality.quality", "Quality", quality),
                Fact("shot_quality.shots_on.home", "Home shots on", home.ShotsOnTarget),
                Fact("shot_quality.shots_on.away", "Away shots on", away.ShotsOnTarget),
            ],
            Chart = new ToolChart
            {
                Title = "Shots on target",
                Bars =
                [
                    new() { Name = "On target", A = home.ShotsOnTarget, B = away.ShotsOnTarget, ALabel = match.Home?.Name ?? "H", BLabel = match.Away?.Name ?? "A" },
                    new() { Name = "Off target", A = home.ShotsOffTarget, B = away.ShotsOffTarget, ALabel = match.Home?.Name ?? "H", BLabel = match.Away?.Name ?? "A" },
                    new() { Name = "Blocked", A = home.ShotsBlocked, B = away.ShotsBlocked, ALabel = match.Home?.Name ?? "H", BLabel = match.Away?.Name ?? "A" },
                ],
            },
            Method = "nearest shot-family row + depth heuristic",
            Coverage = $"Through index {i}",
            Caveats = ["Not xG. No defender positions in feed."],
            CannotTell = ["true xG", "shot speed"],
        };
    }

    public static ToolResult PlayerSpotlight(MatchDto match, AskRequest ctx)
    {
        var track = match.Situations;
        var i = PlayCursor.ClampIndex(track, ctx.PlayIndex);
        var name = (ctx.FavoritePlayer ?? "").Trim();
        var events = 0;
        var goals = 0;
        var cards = 0;
        var shots = 0;
        var found = false;

        if (!string.IsNullOrEmpty(name))
        {
            for (var n = 0; n <= i; n++)
            {
                var row = track[n];
                if (!string.Equals(row.Player?.Trim(), name, StringComparison.Ordinal)) continue;
                found = true;
                events++;
                var kind = PlayCursor.Kind(row);
                if (kind == "goal") goals++;
                if (kind == "card") cards++;
                if (kind is "goal" or "shotontarget" or "shotofftarget" or "shotblocked" or "goalkeeper_saved")
                    shots++;
            }
        }

        return new ToolResult
        {
            Tool = "player_spotlight",
            Facts =
            [
                Fact("player_spotlight.name", "Player", string.IsNullOrEmpty(name) ? null : name),
                Fact("player_spotlight.events", "Named events", events),
                Fact("player_spotlight.goals", "Goals", goals),
                Fact("player_spotlight.cards", "Cards", cards),
                Fact("player_spotlight.shots", "Shot-family", shots),
                Fact("player_spotlight.found", "Found", found),
            ],
            Method = "exact player string match through playIndex",
            Coverage = $"0..{i}",
            Caveats = ["Assists in text are not parsed in v1."],
            CannotTell = ["heat maps", "distance covered"],
        };
    }

    public static ToolResult Recap(MatchDto match, AskRequest ctx)
    {
        var track = match.Situations;
        var i = PlayCursor.ClampIndex(track, ctx.PlayIndex);
        var seenEnded = false;
        var seenPeriodScore = false;
        for (var n = 0; n <= i; n++)
        {
            var kind = PlayCursor.Kind(track[n]);
            if (kind == "match_ended") seenEnded = true;
            if (kind == "periodscore") seenPeriodScore = true;
        }

        var period = seenEnded ? "ft" : seenPeriodScore ? "ht" : "live";
        var (h, a) = PlayCursor.ScoreAt(track, i);
        var (home, away) = PlayCursor.StatsAt(track, i);

        var facts = new List<ToolFact>
        {
            Fact("recap.period", "Period", period),
            Fact("recap.score.home", "Home score", h),
            Fact("recap.score.away", "Away score", a),
            Fact("recap.shots_on.home", "Home shots on", home.ShotsOnTarget),
            Fact("recap.shots_on.away", "Away shots on", away.ShotsOnTarget),
            Fact("recap.cards.home", "Home cards", home.Cards),
            Fact("recap.cards.away", "Away cards", away.Cards),
        };

        var goals = new List<(int Minute, string Player, string Team)>();
        for (var n = 0; n <= i; n++)
        {
            var row = track[n];
            if (PlayCursor.Kind(row) != "goal") continue;
            goals.Add((row.Minute ?? 0, row.Player ?? "Unknown", row.Team ?? ""));
        }
        facts.Add(Fact("recap.goals_count", "Goals", goals.Count));
        for (var g = 0; g < goals.Count; g++)
        {
            var (minute, player, team) = goals[g];
            facts.Add(Fact($"recap.goal_{g}.minute", $"Goal {g + 1} minute", minute));
            facts.Add(Fact($"recap.goal_{g}.player", $"Goal {g + 1} player", player));
            facts.Add(Fact($"recap.goal_{g}.team", $"Goal {g + 1} team", team));
        }

        return new ToolResult
        {
            Tool = "recap",
            Facts = facts,
            Chart = new ToolChart
            {
                Title = "Score path",
                Bars = BuildScorePath(track, i, match),
            },
            Method = "scoreAt + statsAt + goal list",
            Coverage = $"Through index {i} ({period})",
            Caveats = ["Scorer list only includes events with a player field."],
            CannotTell = ["expected goals", "xg timeline"],
        };
    }

    static List<ToolChartBar> BuildScorePath(IReadOnlyList<Situation> track, int index, MatchDto match)
    {
        var bars = new List<ToolChartBar>();
        var h = 0;
        var a = 0;
        bars.Add(new() { Name = "Kickoff", A = 0, B = 0, ALabel = match.Home?.Short ?? "H", BLabel = match.Away?.Short ?? "A" });
        for (var n = 0; n <= index; n++)
        {
            if (PlayCursor.Kind(track[n]) != "goal") continue;
            if (track[n].Team == "home") h++;
            else if (track[n].Team == "away") a++;
            bars.Add(new()
            {
                Name = $"{track[n].Minute ?? 0}'",
                A = h,
                B = a,
                ALabel = match.Home?.Short ?? "H",
                BLabel = match.Away?.Short ?? "A",
            });
        }
        return bars.Count > 4 ? bars.TakeLast(4).ToList() : bars;
    }

    public ToolResult DataLimits(MatchDto match, AskRequest ctx)
    {
        var track = match.Situations;
        var types = track.Select(PlayCursor.Kind).Where(k => !string.IsNullOrEmpty(k)).Distinct(StringComparer.Ordinal).Count();
        var hasPlayers = track.Any(r => !string.IsNullOrWhiteSpace(r.Player));
        var hasPhases = track.Any(r => !string.IsNullOrWhiteSpace(r.Phase));

        return new ToolResult
        {
            Tool = "data_limits",
            Facts =
            [
                // 0 until DataLimitsAsync reads the catalog.
                Fact("data_limits.matches_in_catalog", "Catalog size", 0),
                Fact("data_limits.has_player_names", "Has player names", hasPlayers),
                Fact("data_limits.has_phases", "Has phases", hasPhases),
                Fact("data_limits.event_types_count", "Event type count", types),
                Fact("data_limits.scope", "Scope", "single synthetic match through playhead"),
            ],
            Method = "static capability catalog + feed sniff",
            Coverage = ctx.MatchId,
            Caveats = ["Cannot answer historical league tables or real PL club form outside this feed."],
            CannotTell =
            [
                "real Premier League standings",
                "player GPS / tracking",
                "odds / betting",
                "video auto-eventing",
            ],
        };
    }

    public async Task<ToolResult> DataLimitsAsync(MatchDto match, AskRequest ctx, CancellationToken ct)
    {
        var result = DataLimits(match, ctx);
        try
        {
            var catalog = await store.GetCatalogAsync(ct);
            var count = catalog.Matches?.Count ?? 0;
            var fact = result.Facts.FirstOrDefault(f => f.Id == "data_limits.matches_in_catalog");
            if (fact is not null) fact.Value = count;
        }
        catch
        {
            // leave 0
        }
        return result;
    }
}
