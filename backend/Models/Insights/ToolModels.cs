namespace Touchline.Api.Models.Insights;

public sealed class ToolFact
{
    public string Id { get; set; } = "";
    public string Label { get; set; } = "";
    public object? Value { get; set; }
    public string? Unit { get; set; }
}

public sealed class ToolChartBar
{
    public string Name { get; set; } = "";
    public double A { get; set; }
    public double B { get; set; }
    public string ALabel { get; set; } = "";
    public string BLabel { get; set; } = "";
}

public sealed class ToolChart
{
    public string Title { get; set; } = "";
    public List<ToolChartBar> Bars { get; set; } = [];
}

public sealed class ToolResult
{
    public string Tool { get; set; } = "";
    public List<ToolFact> Facts { get; set; } = [];
    public ToolChart? Chart { get; set; }
    public string Method { get; set; } = "";
    public string Coverage { get; set; } = "";
    public List<string> Caveats { get; set; } = [];
    public List<string> CannotTell { get; set; } = [];
}

public sealed record AskRequest
{
    public string MatchId { get; set; } = "";
    public int PlayIndex { get; set; }
    public string? Question { get; set; }
    /// <summary>casual | analyst</summary>
    public string Mode { get; set; } = "casual";
    /// <summary>neutral | home | away — fan allegiance for narration lean.</summary>
    public string Supporting { get; set; } = "neutral";
    /// <summary>auto | pressing | shots | possession | key_moment</summary>
    public string FocusMetric { get; set; } = "auto";
    /// <summary>UI/narrative locale id (en, pt, sq, …).</summary>
    public string? Language { get; set; }
    public string? FavoritePlayer { get; set; }
    public int? WindowMinutes { get; set; }
}

public sealed class SuggestRequest
{
    public string MatchId { get; set; } = "";
    public int PlayIndex { get; set; }
}

public sealed class SuggestItem
{
    public string Id { get; set; } = "";
    public string Prompt { get; set; } = "";
    public string Hint { get; set; } = "";
    public string ToolBias { get; set; } = "";
}

public sealed class SuggestResponse
{
    public List<SuggestItem> Suggestions { get; set; } = [];
}

public sealed class ReceiptFigure
{
    public string Value { get; set; } = "";
    public string Label { get; set; } = "";
    public string Evidence { get; set; } = "";
}

/// <summary>Measured wall-clock per pipeline stage, in milliseconds.</summary>
public sealed class AskStages
{
    public long ToolsMs { get; set; }
    public long ModelMs { get; set; }
    public long GroundMs { get; set; }
    public long TotalMs { get; set; }
}

/// <summary>Token accounting from the model. Null counts mean no model call was made.</summary>
public sealed class AskUsage
{
    public int ModelCalls { get; set; }
    public int? InputTokens { get; set; }
    public int? OutputTokens { get; set; }
}

public sealed class AskResponse
{
    public string Question { get; set; } = "";
    public string Status { get; set; } = "live";
    public int Grounded { get; set; }
    public string Model { get; set; } = "";
    public string Latency { get; set; } = "";
    public string Narrative { get; set; } = "";
    public List<ReceiptFigure> Figures { get; set; } = [];
    public ToolChart? Chart { get; set; }
    public List<string> Caveats { get; set; } = [];
    public bool InScope { get; set; } = true;
    public string TraceId { get; set; } = "";
    public List<string> ToolsUsed { get; set; } = [];
    public AskStages Stages { get; set; } = new();
    public AskUsage Usage { get; set; } = new();
}
