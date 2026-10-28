using System.Globalization;
using System.Text.RegularExpressions;
using Touchline.Api.Models.Insights;

namespace Touchline.Api.Services.Insights;

/// <summary>
/// Every number in the narrative must appear as a tool fact value. Numbers only — it does not
/// know which label a number belongs to. Limits are spelled out in docs/foundry.md.
/// </summary>
public static partial class Grounding
{
    [GeneratedRegex(@"\d+(?:\.\d+)?%?")]
    private static partial Regex NumberPattern();

    // recap.goal_0.minute and friends: drop before scanning so their digits are not counted.
    [GeneratedRegex(@"\b[a-z]+(?:_[a-z]+)*(?:\.[a-z0-9_]+)+\b")]
    private static partial Regex EvidenceIdPattern();

    public sealed record Result(bool Ok, int Checked, string Narrative, string? Notice, string? Offender = null);

    public static Result Check(string narrative, string question, IEnumerable<ToolResult> tools)
    {
        var plain = new HashSet<string>(StringComparer.Ordinal);
        var percent = new HashSet<string>(StringComparer.Ordinal);
        foreach (var tool in tools)
        {
            foreach (var fact in tool.Facts)
            {
                var bag = fact.Unit == "%" ? percent : plain;
                foreach (var token in TokensFor(fact.Value))
                    bag.Add(token);
            }
        }

        var questionNumbers = NumberPattern().Matches(question ?? "")
            .Select(m => Normalize(m.Value))
            .ToHashSet(StringComparer.Ordinal);

        var scanned = EvidenceIdPattern().Replace(narrative ?? "", " ");
        var checkedCount = 0;
        foreach (Match m in NumberPattern().Matches(scanned))
        {
            var raw = m.Value;
            var token = Normalize(raw);
            if (questionNumbers.Contains(token)) continue;
            checkedCount++;

            var ok = raw.EndsWith('%')
                ? percent.Contains(token)
                : plain.Contains(token) || percent.Contains(token);
            if (!ok)
            {
                return new Result(false, checkedCount, "",
                    "Narrative hid after grounding fail — figures below still come from tools.",
                    raw);
            }
        }

        return new Result(true, checkedCount, narrative ?? "", null);
    }

    static IEnumerable<string> TokensFor(object? value)
    {
        if (value is null or bool) yield break;
        var s = Convert.ToString(value, CultureInfo.InvariantCulture) ?? "";
        if (value is int or long or double or float or decimal)
        {
            yield return Normalize(s);
            yield break;
        }
        foreach (Match m in NumberPattern().Matches(s))
            yield return Normalize(m.Value);
    }

    static string Normalize(string raw)
    {
        var s = raw.Trim();
        if (s.EndsWith('%')) s = s[..^1];
        if (double.TryParse(s, NumberStyles.Float, CultureInfo.InvariantCulture, out var d))
        {
            if (Math.Abs(d - Math.Round(d)) < 0.0001)
                return ((long)Math.Round(d)).ToString(CultureInfo.InvariantCulture);
            return d.ToString("0.##", CultureInfo.InvariantCulture);
        }
        return s;
    }
}
