using System.Text.Json;

namespace Touchline.Api.Models;

public sealed class LiveSnapshot
{
    public string MatchId { get; set; } = "";
    public int SituationCount { get; set; }
    public int Received { get; set; }
    public bool Publishing { get; set; }
    public JsonElement? Fixture { get; set; }
    public List<JsonElement> Situations { get; set; } = [];
}
