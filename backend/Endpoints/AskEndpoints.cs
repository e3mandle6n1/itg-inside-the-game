using Touchline.Api.Models.Insights;
using Touchline.Api.Services.Insights;

namespace Touchline.Api.Endpoints;

public static class AskEndpoints
{
    public static IEndpointRouteBuilder MapAskEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api");

        group.MapPost("/ask", async (AskRequest body, AskService ask, CancellationToken ct) =>
        {
            var result = await ask.AskAsync(body, ct);
            return result is null
                ? Results.NotFound(new { error = $"Unknown match: {body.MatchId}" })
                : Results.Ok(result);
        });

        group.MapGet("/suggest", async (
            string matchId,
            int? playIndex,
            AskService ask,
            CancellationToken ct) =>
        {
            var result = await ask.SuggestAsync(new SuggestRequest
            {
                MatchId = matchId,
                PlayIndex = playIndex ?? 0,
            }, ct);
            return result is null
                ? Results.NotFound(new { error = $"Unknown match: {matchId}" })
                : Results.Ok(result);
        });

        return app;
    }
}
