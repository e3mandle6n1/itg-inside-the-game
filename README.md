# Touchline Radar

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=000)](#)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=fff)](#)
[![Vitest](https://img.shields.io/badge/Vitest-3-6E9F18?logo=vitest&logoColor=fff)](#)
[![.NET](https://img.shields.io/badge/.NET-10-512BD4?logo=dotnet&logoColor=fff)](#)
[![C#](https://img.shields.io/badge/C%23-239120?logo=csharp&logoColor=fff)](#)
[![xUnit](https://img.shields.io/badge/xUnit-2.9-5C2D91?logo=dotnet&logoColor=fff)](#)
[![Azure Event Hubs](https://img.shields.io/badge/Azure%20Event%20Hubs-0078D4?logo=microsoftazure&logoColor=fff)](#)
[![Azure Blob Storage](https://img.shields.io/badge/Azure%20Blob%20Storage-0078D4?logo=microsoftazure&logoColor=fff)](#)
[![Microsoft Foundry](https://img.shields.io/badge/Microsoft%20Foundry-Azure%20OpenAI-0078D4?logo=microsoftazure&logoColor=fff)](#)
[![Docker Compose](https://img.shields.io/badge/Docker%20Compose-2496ED?logo=docker&logoColor=fff)](#)
[![nginx](https://img.shields.io/badge/nginx-1.27-009639?logo=nginx&logoColor=fff)](#)

Live football match tracker with a grounded insights studio. A .NET API seeds synthetic match
files into blob storage, publishes them onto Event Hubs, and streams them to a React page over
SSE. The studio answers playhead questions with read-only tools for the numbers, Foundry (or an
offline rules narrator) for the sentence, and a grounding check that hides anything the tools
did not produce.

## Responsibilities

- Replay a synthetic match on a 2D pitch with a scoreboard, timeline, stats, lineups and tips.
- Drive the replay from an Event Hub so a browser refresh resumes at the live tip.
- Answer playhead questions from read-only analytics tools with evidence IDs and caveats.
- Keep the model honest: numbers are computed in code; the narrative is checked against them.
- Run the whole stack locally with one `docker compose up`, with no cloud dependency unless
  Foundry is configured.

## Architecture

```text
browser (React, nginx in Docker / Vite in dev)
  ├─ GET  /api/catalog, /api/matches/:id      ─┐
  ├─ POST /api/publish/:id                     │
  ├─ GET  /api/live/:id/snapshot, /live/:id ◄──┤  Touchline.Api (.NET 10)
  ├─ GET  /api/suggest                         │    ├─ BlobMatchStore      ── Azurite / Blob Storage
  └─ POST /api/ask                            ─┘    ├─ EventHubPublisher   ── Event Hubs (emulator)
                                                    ├─ HubConsumerService  ── fills HubFeedStore → SSE
                                                    └─ Insights: InsightTools → INarrator → Grounding
                                                         (RulesNarrator offline · FoundryNarrator when configured)
```

- `src/` owns the page; `src/match/` turns `situations[]` into the play track the pitch renders.
- `backend/` owns storage, hub publish/consume, and the insights loop.
- `infra/` holds the two Dockerfiles, the nginx proxy template and the emulator config.
- Match JSON never lives in git; it is mounted from `MATCH_SEED_DIR` and seeded into blob storage on start.
- More detail: [docs/event-hubs.md](docs/event-hubs.md) (feed path), [docs/foundry.md](docs/foundry.md)
  (ask loop), [docs/INSIGHTS-TOOLS.md](docs/INSIGHTS-TOOLS.md) (tool contracts).

## API

| Route | Purpose |
|---|---|
| `GET /api/catalog` | Match list and default id |
| `GET /api/matches/{id}` | Enriched match JSON (fixture + `situations[]`) |
| `POST /api/publish/{id}` | Start or restart publishing a match onto the hub |
| `GET /api/live/{id}/snapshot` | Fixture plus situations buffered so far |
| `GET /live/{id}` | SSE stream of new situations |
| `GET /api/suggest?matchId=&playIndex=` | Playhead-aware prompts |
| `POST /api/ask` | Tools → narrate → ground → receipt |
| `POST /api/admin/seed` | Re-seed blob storage from `MATCH_SEED_DIR` |
| `GET /health` | Liveness |

Contracts for `/api/ask` and the tools behind it: [docs/INSIGHTS-TOOLS.md](docs/INSIGHTS-TOOLS.md).

## Configuration

Copy `.env.example` to `.env`. Compose reads it.

```bash
MATCH_SEED_DIR=/absolute/path/to/matches   # index.json + one JSON per match; required

# Optional — Microsoft Foundry / Azure OpenAI. Unset → offline rules narrator.
FOUNDRY_ENDPOINT=https://<resource>.openai.azure.com/
FOUNDRY_MODEL=<deployment-name>            # compose default: gpt-4o-mini
FOUNDRY_API_KEY=                           # empty → DefaultAzureCredential
```

Event Hub and storage connection strings for the local emulators are set in `compose.yml`.
`.env` is gitignored; keep real keys out of the repo.

## Local development

```bash
docker compose up -d --build     # emulator, Azurite, API on :8080, page on :4173
docker compose down
```

Open [http://localhost:4173](http://localhost:4173). Switch matches with the Match dropdown or
`?match=<id>`. The page publishes the selected match onto the hub and follows it live; see
[docs/event-hubs.md](docs/event-hubs.md).

For a hot-reloading page against the Compose API: `npm install && npm run dev` (Vite proxies
`/api` and `/live` to `http://127.0.0.1:8080`).

## Test

```bash
npm test                                 # Vitest: src/match play track, stats, feed messages
dotnet test tests/Touchline.Api.Tests    # xUnit: insight tools, grounding, ask service
```

The .NET tests use an in-code fixture (`MatchFixture.cs`) with hand-tallied expectations, so they
run without `MATCH_SEED_DIR` or any emulator.

## Scripts

| Script | Job |
|---|---|
| `scripts/generate-scenarios.mjs` | Builds lean scenario feeds under `feeds/matches/` from `feeds/match.json` |
| `scripts/enrich-northbridge.py` | Stitches open-play texture into the Northbridge feed (paths are hard-coded at the top) |

Both write to local paths outside git. Server-side enrichment (`MatchEnricher`,
`MatchInsightEnricher`) runs on every `GET /api/matches/{id}`.
