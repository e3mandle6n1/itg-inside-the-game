using Touchline.Api.Models.Insights;
using Touchline.Api.Services.Insights;
using static Touchline.Api.Tests.MatchFixture;

namespace Touchline.Api.Tests;

public class GroundingTests
{
    static readonly AskRequest AtGoal = new() { MatchId = "01-northbridge", PlayIndex = OpeningGoal };

    static ToolResult[] GoalTools() =>
    [
        InsightTools.MatchState(Northbridge(), AtGoal),
        InsightTools.PressureWindow(Northbridge(), AtGoal),
    ];

    static ToolResult Facts(params (string Id, object? Value, string? Unit)[] facts) => new()
    {
        Tool = "test",
        Facts = facts.Select(f => new ToolFact { Id = f.Id, Value = f.Value, Unit = f.Unit }).ToList(),
    };

    [Fact]
    public void Passes_when_every_number_comes_from_a_tool()
    {
        var result = Grounding.Check(
            "Northbridge 1–0 Rivermark at 64'. Danger share 75–0 in the last 5, home_control.",
            "Why does this moment matter?",
            GoalTools());

        Assert.True(result.Ok);
        Assert.Equal(6, result.Checked);
        Assert.Null(result.Offender);
    }

    [Fact]
    public void Fails_on_an_invented_number_and_names_it()
    {
        var result = Grounding.Check(
            "Northbridge lead 1–0 after 12 shots.",
            "Why does this moment matter?",
            GoalTools());

        Assert.False(result.Ok);
        Assert.Equal("12", result.Offender);
        Assert.Equal("", result.Narrative);
        Assert.NotNull(result.Notice);
    }

    [Fact]
    public void Numbers_echoed_from_the_question_are_exempt()
    {
        var result = Grounding.Check(
            "Over the last 10 minutes Northbridge lead 1–0.",
            "What happened in the last 10 minutes?",
            GoalTools());

        Assert.True(result.Ok);
        Assert.Equal(2, result.Checked);
    }

    [Fact]
    public void A_percent_token_must_match_a_percent_fact()
    {
        var tools = new[] { Facts(("minute", 64, null), ("possession.home", 75, "%")) };

        var minuteAsPercent = Grounding.Check("64% possession", "", tools);
        var realPercent = Grounding.Check("75% possession at 64'", "", tools);

        Assert.False(minuteAsPercent.Ok);
        Assert.Equal("64%", minuteAsPercent.Offender);
        Assert.True(realPercent.Ok);
    }

    [Fact]
    public void Evidence_ids_quoted_in_prose_are_not_scanned_as_numbers()
    {
        var tools = new[] { Facts(("key_moment.minute", 64, null)) };

        var result = Grounding.Check("Per key_moment.goal_7.minute the goal came at 64'.", "", tools);

        Assert.True(result.Ok);
        Assert.Equal(1, result.Checked);
    }

    [Fact]
    public void Decimals_match_at_written_precision()
    {
        var tools = new[] { Facts(("quality", 0.35, null)) };

        Assert.True(Grounding.Check("quality 0.35", "", tools).Ok);
        Assert.True(Grounding.Check("quality 0.350", "", tools).Ok); // normalises to 0.35
        Assert.False(Grounding.Check("quality 0.4", "", tools).Ok);
    }

    [Fact]
    public void Numbers_inside_string_facts_count_as_evidence()
    {
        var tools = new[] { Facts(("label", "3 of 4 rows", null)) };

        Assert.True(Grounding.Check("3 of the last 4 rows were dangerous", "", tools).Ok);
        Assert.False(Grounding.Check("5 of the last 4 rows", "", tools).Ok);
    }

    [Fact]
    public void An_empty_narrative_is_grounded_with_nothing_checked()
    {
        var result = Grounding.Check("", "", GoalTools());

        Assert.True(result.Ok);
        Assert.Equal(0, result.Checked);
    }
}
