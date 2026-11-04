using Touchline.Api.Models;
using Touchline.Api.Models.Insights;

namespace Touchline.Api.Services.Insights;

/// <summary>What the narrator measured while it worked. Token counts are null when no model ran.</summary>
public sealed record NarrationStats(
    long ToolMs,
    long ModelMs,
    int ModelCalls,
    int? InputTokens,
    int? OutputTokens);

public sealed record Narration(
    string Narrative,
    IReadOnlyList<string> KeyEvidenceIds,
    bool InScope,
    string Model,
    IReadOnlyList<ToolResult> ToolsUsed,
    NarrationStats Stats);

public interface INarrator
{
    string Name { get; }
    Task<Narration> NarrateAsync(
        MatchDto match,
        AskRequest request,
        CancellationToken cancellationToken = default);
}
