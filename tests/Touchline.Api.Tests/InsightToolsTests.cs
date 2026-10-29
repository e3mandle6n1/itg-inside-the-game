using Touchline.Api.Models.Insights;
using Touchline.Api.Services.Insights;
using static Touchline.Api.Tests.MatchFixture;

namespace Touchline.Api.Tests;

public class InsightToolsTests
{
    static AskRequest At(int playIndex, string? favoritePlayer = null) => new()
    {
        MatchId = "01-northbridge",
        PlayIndex = playIndex,
        FavoritePlayer = favoritePlayer,
    };

    static object? Fact(ToolResult result, string id) =>
        result.Facts.Single(f => f.Id == id).Value;

    [Fact]
    public void MatchState_at_opening_goal_is_1_0_at_64_with_75_percent_home_rows()
    {
        var state = InsightTools.MatchState(Northbridge(), At(OpeningGoal));

        Assert.Equal(1, Fact(state, "match_state.score.home"));
        Assert.Equal(0, Fact(state, "match_state.score.away"));
        Assert.Equal(64, Fact(state, "match_state.minute"));
        Assert.Equal("dangerous", Fact(state, "match_state.phase"));
        // Rows 0..14 with a team and not a period boundary: home 9, away 3.
        Assert.Equal(75, Fact(state, "match_state.possession.home"));
        Assert.Equal(25, Fact(state, "match_state.possession.away"));
        Assert.Equal("%", state.Facts.Single(f => f.Id == "match_state.possession.home").Unit);
    }

    [Fact]
    public void MatchState_before_kickoff_is_0_0_with_no_possession()
    {
        var state = InsightTools.MatchState(Northbridge(), At(0));

        Assert.Equal(0, Fact(state, "match_state.score.home"));
        Assert.Equal(0, Fact(state, "match_state.possession.home"));
        Assert.Equal(0, Fact(state, "match_state.possession.away"));
    }

    [Fact]
    public void PressureWindow_before_opening_goal_is_home_control()
    {
        var pressure = InsightTools.PressureWindow(Northbridge(), At(OpeningGoal));

        // Minutes 59..64: rows 11-14, three of four dangerous, all home.
        Assert.Equal(5, Fact(pressure, "pressure_window.minutes"));
        Assert.Equal(75, Fact(pressure, "pressure_window.dangerous_share.home"));
        Assert.Equal(0, Fact(pressure, "pressure_window.dangerous_share.away"));
        Assert.Equal("home_control", Fact(pressure, "pressure_window.label"));
    }

    [Fact]
    public void PressureWindow_in_the_early_exchanges_is_contested()
    {
        var pressure = InsightTools.PressureWindow(Northbridge(), At(AwayShot));

        // Minutes 0..5: rows 1-7, dangerous home 2 of 7, away 2 of 7 → 29% each,
        // under both the 55% control and the 35% chaos thresholds.
        Assert.Equal(29, Fact(pressure, "pressure_window.dangerous_share.home"));
        Assert.Equal(29, Fact(pressure, "pressure_window.dangerous_share.away"));
        Assert.Equal("contested", Fact(pressure, "pressure_window.label"));
    }

    [Fact]
    public void PressureWindow_clamps_window_to_1_to_45_minutes()
    {
        var wide = InsightTools.PressureWindow(Northbridge(), new AskRequest { PlayIndex = FullTime, WindowMinutes = 90 });
        var none = InsightTools.PressureWindow(Northbridge(), new AskRequest { PlayIndex = FullTime, WindowMinutes = 0 });

        Assert.Equal(5, Fact(wide, "pressure_window.minutes"));
        Assert.Equal(5, Fact(none, "pressure_window.minutes"));
    }

    [Fact]
    public void KeyMoment_opening_goal_scores_high_and_records_score_swing()
    {
        var key = InsightTools.KeyMoment(Northbridge(), At(OpeningGoal));

        Assert.Equal("goal", Fact(key, "key_moment.type"));
        Assert.Equal("home", Fact(key, "key_moment.team"));
        Assert.Equal(64, Fact(key, "key_moment.minute"));
        Assert.Equal(0, Fact(key, "key_moment.score_before.home"));
        Assert.Equal(0, Fact(key, "key_moment.score_before.away"));
        Assert.Equal(1, Fact(key, "key_moment.score_after.home"));
        Assert.Equal(0, Fact(key, "key_moment.score_after.away"));
        // goal 40 + opens scoring 25 + takes the lead 20; home scoring under home_control adds nothing.
        Assert.Equal(85, Fact(key, "key_moment.salience"));
        Assert.Equal("home_control", Fact(key, "key_moment.preceding_label"));
    }

    [Fact]
    public void KeyMoment_second_goal_is_a_goal_but_not_a_swing()
    {
        var key = InsightTools.KeyMoment(Northbridge(), At(SecondGoal));

        Assert.Equal(1, Fact(key, "key_moment.score_before.home"));
        Assert.Equal(2, Fact(key, "key_moment.score_after.home"));
        // goal 40 only: lead already held, home_control is the scorer's own side.
        Assert.Equal(40, Fact(key, "key_moment.salience"));
    }

    [Fact]
    public void KeyMoment_yellow_card_is_low_salience()
    {
        var key = InsightTools.KeyMoment(Northbridge(), At(8));

        Assert.Equal("card", Fact(key, "key_moment.type"));
        Assert.Equal(15, Fact(key, "key_moment.salience"));
    }

    [Fact]
    public void KeyMoment_on_a_plain_phase_row_is_match_action_with_zero_salience()
    {
        var key = InsightTools.KeyMoment(Northbridge(), At(2));

        Assert.Equal("match_action", Fact(key, "key_moment.type"));
        Assert.Equal(0, Fact(key, "key_moment.salience"));
    }

    [Fact]
    public void ShotQuality_off_target_from_the_box_is_0_35()
    {
        var shot = InsightTools.ShotQuality(Northbridge(), At(FirstShot));

        Assert.Equal("off_target", Fact(shot, "shot_quality.outcome"));
        Assert.Equal("home", Fact(shot, "shot_quality.team"));
        Assert.Equal(0.35, Fact(shot, "shot_quality.quality"));
        Assert.Equal(0, Fact(shot, "shot_quality.shots_on.home"));
        Assert.Equal(0, Fact(shot, "shot_quality.shots_on.away"));
    }

    [Fact]
    public void ShotQuality_away_on_target_mirrors_depth_and_counts_on_target()
    {
        var shot = InsightTools.ShotQuality(Northbridge(), At(AwayShot));

        Assert.Equal("on_target", Fact(shot, "shot_quality.outcome"));
        Assert.Equal("away", Fact(shot, "shot_quality.team"));
        // 0.70 base; x 10 for the away side is depth 90 → +0.10.
        Assert.Equal(0.80, Fact(shot, "shot_quality.quality"));
        Assert.Equal(1, Fact(shot, "shot_quality.shots_on.away"));
    }

    [Fact]
    public void ShotQuality_walks_back_to_the_nearest_shot()
    {
        var shot = InsightTools.ShotQuality(Northbridge(), At(SecondGoal + 1));

        Assert.Equal("goal", Fact(shot, "shot_quality.outcome"));
        Assert.Equal(2, Fact(shot, "shot_quality.shots_on.home"));
    }

    [Fact]
    public void ShotQuality_before_any_shot_is_none()
    {
        var shot = InsightTools.ShotQuality(Northbridge(), At(3));

        Assert.Equal("none", Fact(shot, "shot_quality.outcome"));
        Assert.Null(Fact(shot, "shot_quality.team"));
        Assert.Equal(0.0, Fact(shot, "shot_quality.quality"));
    }

    [Fact]
    public void PlayerSpotlight_counts_Dekker_through_the_playhead()
    {
        var midway = InsightTools.PlayerSpotlight(Northbridge(), At(OpeningGoal, Dekker));
        var full = InsightTools.PlayerSpotlight(Northbridge(), At(FullTime, Dekker));

        Assert.True((bool)Fact(midway, "player_spotlight.found")!);
        Assert.Equal(1, Fact(midway, "player_spotlight.goals"));
        Assert.Equal(2, Fact(full, "player_spotlight.goals"));
        Assert.Equal(2, Fact(full, "player_spotlight.events"));
        Assert.Equal(2, Fact(full, "player_spotlight.shots"));
        Assert.Equal(0, Fact(full, "player_spotlight.cards"));
    }

    [Fact]
    public void PlayerSpotlight_counts_cards_and_handles_unknown_names()
    {
        var quinn = InsightTools.PlayerSpotlight(Northbridge(), At(FullTime, Quinn));
        var nobody = InsightTools.PlayerSpotlight(Northbridge(), At(FullTime, "Nobody, Here"));
        var blank = InsightTools.PlayerSpotlight(Northbridge(), At(FullTime, "  "));

        Assert.Equal(1, Fact(quinn, "player_spotlight.cards"));
        Assert.False((bool)Fact(nobody, "player_spotlight.found")!);
        Assert.Equal(0, Fact(nobody, "player_spotlight.events"));
        Assert.Null(Fact(blank, "player_spotlight.name"));
    }

    [Fact]
    public void Recap_at_full_time_lists_both_goals()
    {
        var recap = InsightTools.Recap(Northbridge(), At(FullTime));

        Assert.Equal("ft", Fact(recap, "recap.period"));
        Assert.Equal(2, Fact(recap, "recap.score.home"));
        Assert.Equal(0, Fact(recap, "recap.score.away"));
        Assert.Equal(2, Fact(recap, "recap.shots_on.home"));
        Assert.Equal(1, Fact(recap, "recap.shots_on.away"));
        Assert.Equal(1, Fact(recap, "recap.cards.home"));
        Assert.Equal(0, Fact(recap, "recap.cards.away"));
        Assert.Equal(2, Fact(recap, "recap.goals_count"));
        Assert.Equal(64, Fact(recap, "recap.goal_0.minute"));
        Assert.Equal(Dekker, Fact(recap, "recap.goal_0.player"));
        Assert.Equal("home", Fact(recap, "recap.goal_0.team"));
        Assert.Equal(71, Fact(recap, "recap.goal_1.minute"));
    }

    [Theory]
    [InlineData(HalfTime, "ht")]
    [InlineData(FirstShot, "live")]
    public void Recap_period_follows_the_last_boundary_seen(int playIndex, string expected)
    {
        var recap = InsightTools.Recap(Northbridge(), At(playIndex));

        Assert.Equal(expected, Fact(recap, "recap.period"));
        Assert.Equal(0, Fact(recap, "recap.goals_count"));
    }

    [Fact]
    public async Task DataLimits_sniffs_the_feed_and_reads_the_catalog()
    {
        var match = Northbridge();
        var tools = new InsightTools(new Store(match));

        var limits = await tools.DataLimitsAsync(match, At(FullTime), CancellationToken.None);

        Assert.Equal(3, Fact(limits, "data_limits.matches_in_catalog"));
        Assert.True((bool)Fact(limits, "data_limits.has_player_names")!);
        Assert.True((bool)Fact(limits, "data_limits.has_phases")!);
        // periodstart, shotofftarget, shotontarget, card, periodscore, goal, match_ended
        Assert.Equal(7, Fact(limits, "data_limits.event_types_count"));
        Assert.Contains("odds / betting", limits.CannotTell);
    }

    [Fact]
    public void Run_dispatches_every_registered_tool_and_rejects_unknown_names()
    {
        var match = Northbridge();
        var tools = new InsightTools(new Store(match));

        string[] names = ["match_state", "pressure_window", "key_moment", "shot_quality", "player_spotlight", "recap", "data_limits"];
        foreach (var name in names)
            Assert.Equal(name, tools.Run(name, match, At(FullTime)).Tool);

        var unknown = tools.Run("pass_network", match, At(FullTime));
        Assert.Empty(unknown.Facts);
        Assert.Contains("Unknown tool.", unknown.Caveats);
    }

    [Fact]
    public void Tools_clamp_an_out_of_range_playhead()
    {
        var tooFar = InsightTools.MatchState(Northbridge(), At(999));
        var negative = InsightTools.MatchState(Northbridge(), At(-5));

        Assert.Equal(2, Fact(tooFar, "match_state.score.home"));
        Assert.Equal(0, Fact(negative, "match_state.score.home"));
    }
}
