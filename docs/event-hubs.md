# Event Hubs feed path

The page does not read match files directly. The API publishes a match onto an Event Hub one
situation at a time, consumes the same hub into an in-memory buffer, and streams that buffer to
the browser over SSE. Locally the hub is the
[Azure Event Hubs emulator](https://learn.microsoft.com/en-us/azure/event-hubs/test-locally-with-event-hub-emulator)
and storage is Azurite; on Azure, point `EVENT_HUB_CONNECTION` at a real namespace (drop
`UseDevelopmentEmulator=true`) and `AZURE_STORAGE_CONNECTION` at a real account. The hub name
stays `matches`, the consumer group `bridge`.

Starting the compose file accepts the emulator licence (`ACCEPT_EULA=Y`).

## Pieces

```text
compose.yml                                emulator, Azurite, api, web
infra/eventhubs/config.json                emulator hub + consumer group
infra/api/Dockerfile                       Touchline.Api image
infra/web/Dockerfile + nginx.conf.template page image; proxies /api and /live to the API
backend/Services/MatchSeedHostedService    on start: copy MATCH_SEED_DIR/*.json into blob storage
backend/Services/BlobMatchStore            catalog (index.json) and match JSON from blob storage
backend/Services/EventHubPublisher         match → hub, one message per situation, PUBLISH_INTERVAL_MS apart
backend/Services/HubConsumerService        hub → HubFeedStore (reads from earliest)
backend/Services/HubFeedStore              per-match buffer + SSE subscribers
backend/Endpoints/LiveEndpoints            GET /api/live/:id/snapshot, GET /live/:id (SSE)
backend/Endpoints/MatchEndpoints           POST /api/publish/:id
```

The match id is the file name without `.json`, so `01-northbridge.json` is catalog id `01-northbridge`.

## Messages

Seq `0` is the fixture: teams, form, standings and lineups, with `situations` and `events`
emptied. Each later message is one situation — the same row `buildPlayTrack` reads on the page.
Messages are partitioned by `matchId`.

```json
{ "matchId": "01-northbridge", "seq": 0, "kind": "fixture", "situationCount": 901, "fixture": {} }
{ "matchId": "01-northbridge", "seq": 1, "kind": "situation", "situation": { "minute": 0, "clock": "0'", "team": "home", "phase": "safe", "x": 50, "y": 50 } }
```

`HubFeedStore` drops a repeated `seq`; a fresh fixture message clears that match's buffer.

## Run

Docker Desktop has to be running and `MATCH_SEED_DIR` set in `.env`.

```bash
docker compose up -d --build
```

Open [http://localhost:4173](http://localhost:4173). On match select the page hits
`/api/live/:id/snapshot`, calls `POST /api/publish/:id` if the buffer is empty, hydrates, then
opens `/live/:id`. A refresh resumes at the live tip. The header shows `Bridge · waiting`,
`Live`, or `Bridge · done`.

The emulator forgets the log when its container is recreated. Republish, or change the gap:

```bash
curl -X POST http://localhost:8080/api/publish/01-northbridge
curl -X POST http://localhost:8080/api/publish/02-pens-miss -H 'content-type: application/json' -d '{"interval":20}'
```

Publishing again cancels any in-flight run for that match.

## Configuration

| Variable | Service | Default in compose |
|---|---|---|
| `EVENT_HUB_CONNECTION` | api | emulator connection string |
| `EVENT_HUB_NAME` | api | `matches` |
| `EVENT_HUB_CONSUMER_GROUP` | api | `bridge` |
| `PUBLISH_INTERVAL_MS` | api | `240` |
| `AZURE_STORAGE_CONNECTION` | api | Azurite well-known string |
| `BLOB_CONTAINER` | api | `matches` |
| `MATCH_SEED_PATH` | api | `/seed` (bind-mounted from `MATCH_SEED_DIR`) |
| `API_URL` | web | `http://api:8080` — nginx proxy target |

The browser only ever talks to the page's origin; connection strings stay inside the API container.

## Dev loop without Docker for the page

`npm run dev` starts Vite on `:4173` and proxies `/api` and `/live` to `http://127.0.0.1:8080`,
so you can keep the Compose API running and hot-reload the page.
