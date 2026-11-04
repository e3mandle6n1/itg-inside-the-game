using Microsoft.Extensions.Logging.Abstractions;
using Touchline.Api.Models;
using Touchline.Api.Models.Insights;
using Touchline.Api.Services.Insights;
using static Touchline.Api.Tests.MatchFixture;

namespace Touchline.Api.Tests;

public class AskServiceTests
{
    static AskService Build(INarrator? narrator = null)
    {
        var tools = new InsightTools(new Store(Northbridge()));
        return new AskService(tools, narrator ?? new RulesNarrator(tools), NullLogger<AskService>.Instance);
    }

    [Fact]
    public async Task Rules_narrator_answers_from_tools_with_no_model_call()
    {
        var ask = Build();

        var response = await ask.AskAsync(new AskRequest
        {
            MatchId = "01-northbridge",
            PlayIndex = OpeningGoal,
            Question = "Why does this goal matter?",
            Mode = "analyst",
        });

        Assert.NotNull(response);
        Assert.Equal("live", response.Status);
        Assert.Equal("rules + live tally", response.Model);
        Assert.True(response.Grounded > 0);
        Assert.Contains("key_moment", response.ToolsUsed);
        Assert.Contains("85", response.Narrative); // salience, straight from the tool
        Assert.Equal(0, response.Usage.ModelCalls);
        Assert.Null(response.Usage.InputTokens);
        Assert.Equal(0, response.Stages.ModelMs);
        Assert.True(response.Stages.TotalMs >= response.Stages.GroundMs);
        Assert.NotEmpty(response.Figures);
        Assert.NotEmpty(response.TraceId);
    }

    [Fact]
    public async Task Out_of_scope_questions_route_to_data_limits()
    {
        var ask = Build();

        var response = await ask.AskAsync(new AskRequest
        {
            MatchId = "01-northbridge",
            PlayIndex = FullTime,
            Question = "What are the betting odds for next season?",
        });

        Assert.NotNull(response);
        Assert.False(response.InScope);
        Assert.Contains("data_limits", response.ToolsUsed);
        Assert.Equal("live", response.Status); // refusal text carries no invented numbers
    }

    [Fact]
    public async Task Grounding_failure_hides_the_narrative_but_keeps_the_figures()
    {
        var ask = Build(new InventingNarrator());

        var response = await ask.AskAsync(new AskRequest
        {
            MatchId = "01-northbridge",
            PlayIndex = OpeningGoal,
            Question = "What is the state?",
        });

        Assert.NotNull(response);
        Assert.Equal("grounding_fail", response.Status);
        Assert.DoesNotContain("42", response.Narrative);
        Assert.Contains("grounding", response.Narrative, StringComparison.OrdinalIgnoreCase);
        Assert.NotEmpty(response.Figures);
        Assert.Equal("fake:model", response.Model);
        Assert.Equal(1, response.Usage.ModelCalls);
        Assert.Equal(120, response.Usage.InputTokens);
    }

    [Fact]
    public async Task Unknown_match_and_blank_match_id_return_null()
    {
        var ask = Build();

        Assert.Null(await ask.AskAsync(new AskRequest { MatchId = "99-nope", Question = "?" }));
        Assert.Null(await ask.AskAsync(new AskRequest { MatchId = " ", Question = "?" }));
    }

    [Fact]
    public async Task Question_is_trimmed_capped_and_defaulted()
    {
        var ask = Build();
        var longQuestion = new string('x', 400);

        var capped = await ask.AskAsync(new AskRequest { MatchId = "01-northbridge", Question = longQuestion });
        var blank = await ask.AskAsync(new AskRequest { MatchId = "01-northbridge", Question = "   " });

        Assert.Equal(300, capped!.Question.Length);
        Assert.Equal("What matters at this playhead?", blank!.Question);
    }

    [Fact]
    public async Task Suggestions_follow_the_playhead_and_name_a_recent_scorer()
    {
        var ask = Build();

        var atGoal = await ask.SuggestAsync(new SuggestRequest { MatchId = "01-northbridge", PlayIndex = OpeningGoal });
        var early = await ask.SuggestAsync(new SuggestRequest { MatchId = "01-northbridge", PlayIndex = 3 });

        Assert.NotNull(atGoal);
        Assert.Contains(atGoal.Suggestions, s => s.Id == "player" && s.Prompt.Contains(Dekker));
        Assert.Contains(atGoal.Suggestions, s => s.Prompt.Contains("64'"));
        Assert.True(atGoal.Suggestions.Count <= 6);

        Assert.NotNull(early);
        Assert.DoesNotContain(early.Suggestions, s => s.Id == "player");
    }

    /// <summary>Stands in for a model that reports usage but quotes a number no tool produced.</summary>
    sealed class InventingNarrator : INarrator
    {
        public string Name => "fake:model";

        public Task<Narration> NarrateAsync(MatchDto match, AskRequest request, CancellationToken cancellationToken = default)
        {
            var state = InsightTools.MatchState(match, request);
            return Task.FromResult(new Narration(
                "Northbridge have had 42 shots.",
                ["match_state.score.home"],
                true,
                Name,
                [state],
                new NarrationStats(ToolMs: 1, ModelMs: 250, ModelCalls: 1, InputTokens: 120, OutputTokens: 30)));
        }
    }
}
