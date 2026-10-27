using Touchline.Api.Models;

namespace Touchline.Api.Services.Insights;

/// <summary>
/// Situations[] is the server play track (same rows buildPlayTrack starts from).
/// </summary>
public static class PlayCursor
{
    public static string Kind(Situation row) =>
        row.Incident ?? row.Type ?? "";

    public static int ClampIndex(IReadOnlyList<Situation> track, int index)
    {
        if (track.Count == 0) return 0;
        return Math.Clamp(index, 0, track.Count - 1);
    }

    public static (int Home, int Away) ScoreAt(IReadOnlyList<Situation> track, int index)
    {
        var home = 0;
        var away = 0;
        var end = ClampIndex(track, index);
        for (var i = 0; i <= end; i++)
        {
            var row = track[i];
            if (Kind(row) != "goal") continue;
            if (row.Team == "home") home++;
            else if (row.Team == "away") away++;
        }
        return (home, away);
    }

    public static int MinuteAt(IReadOnlyList<Situation> track, int index, bool complete = true)
    {
        if (track.Count == 0) return 0;
        var tip = index >= track.Count - 1;
        if (complete && tip) return 200;
        var start = ClampIndex(track, index);
        for (var i = start; i >= 0; i--)
        {
            if (track[i].Minute is int m) return m;
        }
        return 0;
    }

    public static string? CardColour(Situation row)
    {
        var raw = (row.Card ?? "").Trim().ToLowerInvariant();
        if (raw is "red" or "yellowred" or "yellow_red" or "secondyellow") return raw == "yellowred" || raw == "yellow_red" ? "yellowred" : raw;
        if (raw.Contains("red")) return raw.Contains("yellow") ? "yellowred" : "red";
        if (raw.Contains("yellow")) return "yellow";
        return string.IsNullOrEmpty(raw) ? "yellow" : raw;
    }

    public sealed class Tallies
    {
        public int Possession;
        public int DangerousTime;
        public int DangerousAttacks;
        public int ShotsOnTarget;
        public int ShotsOffTarget;
        public int ShotsBlocked;
        public int Saves;
        public int Cards;
        public int Yellow;
        public int Red;
        public int Corners;
    }

    public static (Tallies Home, Tallies Away) StatsAt(IReadOnlyList<Situation> track, int index)
    {
        var home = new Tallies();
        var away = new Tallies();
        Tallies? Bag(string? team) => team == "home" ? home : team == "away" ? away : null;

        string? lastDanger = null;
        var end = ClampIndex(track, index);
        for (var i = 0; i <= end; i++)
        {
            var row = track[i];
            var kind = Kind(row);
            var side = Bag(row.Team);
            var isBoundary = kind is "periodstart" or "periodscore" or "match_ended" or "kickoff";

            if (side is not null && !string.IsNullOrEmpty(row.Phase) && !isBoundary)
            {
                side.Possession++;
                if (row.Phase == "dangerous")
                {
                    side.DangerousTime++;
                    var key = $"{row.Team}:dangerous";
                    if (key != lastDanger)
                    {
                        side.DangerousAttacks++;
                        lastDanger = key;
                    }
                }
                else
                {
                    lastDanger = row.Team is null ? null : $"{row.Team}:{row.Phase}";
                }
            }

            if (side is null || string.IsNullOrEmpty(kind)) continue;

            switch (kind)
            {
                case "card":
                    side.Cards++;
                    var colour = CardColour(row);
                    if (colour is "red" or "yellowred") side.Red++;
                    else side.Yellow++;
                    break;
                case "goal":
                case "shotontarget":
                    side.ShotsOnTarget++;
                    break;
                case "goalkeeper_saved":
                    side.Saves++;
                    var shooter = Bag(row.Team == "home" ? "away" : "home");
                    if (shooter is not null) shooter.ShotsOnTarget++;
                    break;
                case "shotofftarget":
                    side.ShotsOffTarget++;
                    break;
                case "shotblocked":
                    side.ShotsBlocked++;
                    break;
                case "corner":
                    side.Corners++;
                    break;
            }
        }

        return (home, away);
    }

    public static int PossessionPct(int home, int away, bool forHome)
    {
        var total = home + away;
        if (total == 0) return 0;
        var h = (int)Math.Round(100.0 * home / total);
        return forHome ? h : 100 - h;
    }
}
