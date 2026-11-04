using Touchline.Api.Models;
using Touchline.Api.Services;

namespace Touchline.Api.Tests;

/// <summary>
/// A twenty-row Northbridge-shaped track small enough to tally by hand.
/// Index comments are what the tests assert against; keep them in step.
/// </summary>
public static class MatchFixture
{
    public const string Dekker = "Dekker, Niels";
    public const string Quinn = "Quinn, Miles";

    public const int FirstShot = 5;       // home shotofftarget, 4', x 88
    public const int AwayShot = 7;        // away shotontarget, 5', x 10
    public const int HalfTime = 9;        // periodscore 45'
    public const int OpeningGoal = 14;    // Dekker, 64', 0-0 → 1-0
    public const int SecondGoal = 17;     // Dekker, 71'
    public const int FullTime = 19;       // match_ended 90'

    public static MatchDto Northbridge() => new()
    {
        Home = new TeamDto { Name = "Northbridge", Short = "NBR" },
        Away = new TeamDto { Name = "Rivermark", Short = "RVM" },
        Situations =
        [
            /* 0 */ Row(0, null, "safe", incident: "periodstart"),
            /* 1 */ Row(1, "home", "safe"),
            /* 2 */ Row(2, "home", "attack"),
            /* 3 */ Row(3, "away", "safe"),
            /* 4 */ Row(4, "home", "dangerous"),
            /* 5 */ Row(4, "home", "dangerous", incident: "shotofftarget", player: "Costa, Rafael", x: 88),
            /* 6 */ Row(5, "away", "dangerous"),
            /* 7 */ Row(5, "away", "dangerous", incident: "shotontarget", player: "Varga, Ilona", x: 10),
            /* 8 */ Row(20, "home", "safe", incident: "card", player: Quinn, card: "yellow"),
            /* 9 */ Row(45, null, "safe", incident: "periodscore"),
            /* 10 */ Row(46, null, "safe", incident: "periodstart"),
            /* 11 */ Row(60, "home", "attack"),
            /* 12 */ Row(62, "home", "dangerous"),
            /* 13 */ Row(63, "home", "dangerous"),
            /* 14 */ Row(64, "home", "dangerous", incident: "goal", player: Dekker, x: 92),
            /* 15 */ Row(66, "away", "safe"),
            /* 16 */ Row(70, "home", "dangerous"),
            /* 17 */ Row(71, "home", "dangerous", incident: "goal", player: Dekker, x: 80),
            /* 18 */ Row(80, "away", "attack"),
            /* 19 */ Row(90, null, "safe", incident: "match_ended"),
        ],
    };

    static Situation Row(
        int minute,
        string? team,
        string phase,
        string? incident = null,
        string? player = null,
        string? card = null,
        double x = 50) => new()
    {
        Minute = minute,
        Clock = $"{minute}'",
        Team = team,
        Phase = phase,
        Incident = incident,
        Player = player,
        Card = card,
        X = x,
        Y = 50,
    };

    /// <summary>In-memory store: one match, a three-entry catalog, no disk.</summary>
    public sealed class Store(MatchDto match, string id = "01-northbridge") : IMatchStore
    {
        public Task<CatalogResponse> GetCatalogAsync(CancellationToken cancellationToken = default) =>
            Task.FromResult(new CatalogResponse
            {
                DefaultId = id,
                Matches =
                [
                    new CatalogEntry { Id = id, Title = "Northbridge v Rivermark" },
                    new CatalogEntry { Id = "02-pens-miss", Title = "Pens miss" },
                    new CatalogEntry { Id = "07-sparse-stalemate", Title = "Sparse" },
                ],
            });

        public Task<MatchDto?> GetEnrichedMatchAsync(string matchId, CancellationToken cancellationToken = default) =>
            Task.FromResult(matchId == id ? match : null);

        public Task SeedFromDiskAsync(CancellationToken cancellationToken = default) => Task.CompletedTask;
    }
}
