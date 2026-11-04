namespace Touchline.Api.Services.Insights;

public sealed class FoundryOptions
{
    public const string SectionName = "Foundry";

    /// <summary>Foundry project or Azure OpenAI endpoint, e.g. https://….openai.azure.com or project URL.</summary>
    public string Endpoint { get; set; } = "";

    /// <summary>Deployment / model name.</summary>
    public string Model { get; set; } = "gpt-4o-mini";

    /// <summary>Optional API key. Empty → DefaultAzureCredential (keyless).</summary>
    public string ApiKey { get; set; } = "";

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(Endpoint) && !string.IsNullOrWhiteSpace(Model);
}
