# Foundry insights

The studio's Ask / Answer rail is served by the API. Tools own every number; the model (or the
offline rules narrator) only writes the sentence, and a grounding pass checks the sentence
against the tool output before the page sees it.

## Loop

```text
GET  /api/suggest?matchId=&playIndex=   → six playhead-aware prompts (deterministic, no model)
POST /api/ask                            → narrator picks tools → tools compute → narrate → ground → receipt
```

Code: `backend/Services/Insights/` — `InsightTools` (the seven tools), `RulesNarrator`
(offline), `FoundryNarrator` (tool-calling over Azure OpenAI / Foundry, falls back to rules on
any failure or non-JSON reply), `Grounding`, `AskService` (assembles the receipt).

Tool contracts: [INSIGHTS-TOOLS.md](./INSIGHTS-TOOLS.md).

## What the receipt contains

| Field | Meaning |
|---|---|
| `status` | `live` or `grounding_fail` |
| `model` | `foundry:<deployment>`, `rules + live tally`, or `rules + live tally (foundry fallback)` |
| `grounded` | How many numeric tokens in the narrative were checked |
| `narrative` | The sentence, or the grounding notice if it was hidden |
| `figures` / `chart` / `caveats` | Straight from tool facts; never hidden |
| `toolsUsed` | Distinct tool names that ran |
| `stages` | Measured ms: `toolsMs`, `modelMs`, `groundMs`, `totalMs` |
| `usage` | `modelCalls`, `inputTokens`, `outputTokens` (token counts are null when no model ran) |
| `traceId` | `Activity.Current.Id` when present, else a random 12-char id. There is no App Insights sink yet, so it is a correlation id for logs only |

The page's Tools → Foundry → Ground strip renders these measured values after the answer arrives.
While a request is in flight it shows "running…" for all three; nothing is animated that the API
did not report.

## What grounding does and does not check

`Grounding.Check` is a number-level filter, not a semantic one.

It does:

- Extract every numeric token from the narrative (`\d+(\.\d+)?%?`), after removing tokens that
  look like evidence IDs (`recap.goal_0.minute`) and numbers that also appear in the question.
- Require each token to equal some tool fact value at written precision (`0.35` ≠ `0.4`;
  `0.350` normalises to `0.35`). Numbers inside string facts count too.
- Require a `%` token to match a fact whose unit is `%` — a minute cannot be passed off as a
  possession share.
- On the first miss, hide the whole narrative and return a notice; figures, chart and caveats stay.

It does not:

- Know which label a number belongs to. "Rivermark lead 1–0" passes if the facts contain a 1
  and a 0, even though Northbridge scored.
- Retry the model. One pass; the plan's "one retry then hide" is not implemented.
- Check words. A wrong team name or player is not caught.

Tests for the cases above: `tests/Touchline.Api.Tests/GroundingTests.cs`.

## Config

Set on the `api` service (Compose passes these through from `.env`):

| Variable | Purpose |
|---|---|
| `FOUNDRY_ENDPOINT` | Azure OpenAI / Foundry resource root (`https://<resource>.openai.azure.com`). `/openai` and `/openai/v1` suffixes are stripped |
| `FOUNDRY_MODEL` | Deployment name. Compose default `gpt-4o-mini` |
| `FOUNDRY_API_KEY` | Optional. Empty → `DefaultAzureCredential` |

Aliases: `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_KEY`.

Without an endpoint, `RulesNarrator` answers from the same tools so the rail works offline.
`FoundryNarrator` runs at temperature 0.2, up to 800 output tokens per turn, and at most six
tool-calling turns before falling back.

## Local check

```bash
docker compose up -d --build
curl -s "http://127.0.0.1:8080/api/suggest?matchId=01-northbridge&playIndex=400" | head
curl -s -X POST http://127.0.0.1:8080/api/ask \
  -H 'content-type: application/json' \
  -d '{"matchId":"01-northbridge","playIndex":400,"question":"Why does this moment matter?","mode":"casual"}'
```

Look at `model`, `stages` and `usage` in the response to confirm whether Foundry answered or the
rules narrator did.
