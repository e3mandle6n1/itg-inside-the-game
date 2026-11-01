/** Live ask / suggest against the API (Foundry when configured, else rules). */

export async function fetchSuggestions(matchId, playIndex) {
  const params = new URLSearchParams({
    matchId,
    playIndex: String(playIndex ?? 0),
  });
  const response = await fetch(`/api/suggest?${params}`);
  if (!response.ok) throw new Error(`suggest ${response.status}`);
  return response.json();
}

export async function askQuestion({
  matchId,
  playIndex,
  question,
  mode = "casual",
  supporting = "neutral",
  focusMetric = "auto",
  language,
  favoritePlayer,
  windowMinutes,
}) {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      matchId,
      playIndex: playIndex ?? 0,
      question,
      mode,
      supporting,
      focusMetric,
      language: language || undefined,
      favoritePlayer: favoritePlayer || undefined,
      windowMinutes: windowMinutes || undefined,
    }),
  });
  if (!response.ok) throw new Error(`ask ${response.status}`);
  return response.json();
}

/** Map API ask payload → ReceiptCard shape. */
export function receiptFromAsk(ask, clock = "") {
  if (!ask) return null;
  return {
    id: ask.traceId || "ask",
    question: ask.question,
    status: ask.status,
    grounded: ask.grounded ?? 0,
    model: ask.model,
    latency: ask.latency,
    narrative: ask.narrative,
    inScope: ask.inScope !== false,
    toolsUsed: ask.toolsUsed || [],
    stages: ask.stages || null,
    usage: ask.usage || null,
    clock,
    figures: (ask.figures || []).map((fig) => ({
      value: fig.value,
      label: fig.label,
      evidence: fig.evidence,
    })),
    chart: ask.chart
      ? {
          title: ask.chart.title,
          bars: (ask.chart.bars || []).map((bar) => ({
            name: bar.name,
            a: bar.a,
            b: bar.b,
            aLabel: bar.aLabel,
            bLabel: bar.bLabel,
          })),
        }
      : null,
    caveats: ask.caveats || [],
  };
}
