# Touchline — Inside the Game Hackathon Plan

Living plan for the Microsoft × Premier League **Inside the Game** hackathon.
Track decisions in the Decision log; strike or amend sections when scope changes.

| | |
|---|---|
| **Challenge** | [Official Rules](https://github.com/microsoft/insidethegamehackathon/blob/main/OFFICIAL%20RULES.md) |
| **Inspiration (execution only)** | [bbenz/football-results-dashboard](https://github.com/bbenz/football-results-dashboard) |
| **Registration closes** | 20 Oct 2026 (12:00 PT) |
| **Submission closes** | 27 Oct 2026 (23:59 PT) |
| **Repo** | `itg-inside-the-game` (Touchline) |
| **Insights tools** | [INSIGHTS-TOOLS.md](./INSIGHTS-TOOLS.md) |

---

## North star

**Touchline becomes a live match intelligence overlay:** as synthetic events stream in, deterministic tools compute state; agents explain why the moment matters; the UI renders broadcast-grade overlays; viewers get personalised modes (analyst / casual / favourite player / language).

**Pitch line:** *We turn a live synthetic event stream into grounded, on-screen match intelligence a broadcaster could put next to the feed.*

### What we steal from Brian Benz (execution)

- Code computes; model explains
- Grounding check on every narrative number
- Receipts: evidence IDs, tool-built charts, caveats, tokens/cost/trace
- Typed read-only tools + hand-computed tests
- One container image; **ACA only** for this timeline
- Keyless Entra / managed identity
- Eval gates before claiming “live AI”
- Demo CLI path (`up` / `verify` / `smoke`)

### What we explicitly reject from that demo

- [ ] Historical international results Q&A as the product
- [ ] Dual AKS + ACA comparison as a deliverable
- [ ] Chat-over-150-years as the main UX

---

## Decision log

Record choices here so the plan stays the source of truth.

| Date | Decision | Choice | Why | Owner |
|---|---|---|---|---|
| 2026-10-16 | Product surface | Live overlay on Touchline, not historical chat | Matches five-stage challenge; we already have pitch + hub feed | |
| | Team size | _TBD: solo / 2 / 3 / 4_ | | |
| | Primary prize aim | Grand Prize | Complete five-stage story | |
| | Secondary category | _TBD: Foundry / Cloud Native / Multi-Agent / Enterprise_ | Pick **one** | |
| 2026-10-30 | Live transport | Event Hubs → HubFeedStore → SSE (+ snapshot) | Replaced the Node bridge; refresh resumes at the tip | |
| | Event richness | Extend current match JSON | Avoid second feed format | |
| | Multi-agent | _TBD: yes / no_ | Only if bandwidth after grounded single-agent works | |
| | Languages | _TBD_ | Nice-to-have after modes | |

---

## Hackathon fit

### Five-stage pipeline (required narrative)

| Stage | Meaning | Touchline today | Target |
|---|---|---|---|
| **Ingest** | Synthetic events as they happen | Hub publish + SSE snapshot | Richer event types |
| **Interpret** | Stats, patterns, context | Score, momentum, ball, set pieces | Typed analytics tools |
| **Explain** | Why the moment matters | Captions / tips | Foundry agent + grounding |
| **Render** | On-screen beside the match | Pitch, scoreboard, tips | Insight strip + recap package |
| **Personalize** | Analyst vs casual vs player focus | None | Mode switcher (+ language later) |

### Judging rubric (20% each) — build to this

| Criterion | How we win it | Status |
|---|---|---|
| Technological implementation | Rich synthetic scenarios, clean repo, Foundry/ACA, tests | ☐ |
| Agentic design & innovation | Tool-calling agent + grounding; optional multi-agent | ☐ |
| Real-world impact | Broadcast / streaming companion framing | ☐ |
| UX & presentation | Strong widget + killer 2‑min video | ☐ |
| Category adherence | Demo shows all five stages | ☐ |

### Stage One gate

Must reasonably fit the theme **and** use featured Microsoft tech. Do not submit a pure React widget with no Azure/AI.

### Rules to not trip over

- Synthetic football-realistic data only (no real PL footage/data we don’t have rights to)
- Project newly created after registration start (29 Sep 2026)
- Public GitHub + working demo URL + ≤2 min video
- Judges may score from video/text alone — video must carry the story

---

## Architecture (target)

```
Browser (Touchline React)
  → web (static / light API)
  → insights (tools + agent)  [internal]
       → deterministic tools over match playTrack / store
       → Microsoft Foundry (keyless)
  ← App Insights (trace ID on every insight)

Ingest path:
  MATCH_SEED_DIR → blob → Event Hubs → HubFeedStore → SSE (+ snapshot on refresh)
```

### Insights tools (v1 list)

Full contracts: [INSIGHTS-TOOLS.md](./INSIGHTS-TOOLS.md).

| Tool | Job | Done |
|---|---|---|
| `match_state` | Score, phase, possession, tempo | ☑ |
| `pressure_window` | Control vs chaos over last N minutes | ☑ |
| `key_moment` | Why this event matters given preceding track | ☑ |
| `shot_quality` | On-target / blocked / heuristic quality | ☑ |
| `player_spotlight` | Favourite player touches / speed spikes | ☑ |
| `recap` | HT / FT deterministic bullet facts | ☑ |
| `data_limits` | Honest scope / what the feed can’t tell | ☑ |

### Agent loop

Ask → Plan → Compute (tools) → Explain (Foundry) → Check (grounding) → Show

Budgets: keep tip narratives **p95 &lt; 5–8s** for live feel; cap tool calls; hide narrative on grounding fail (keep evidence).

### Personalization modes (v1)

- [ ] `analyst` — denser, evidence-heavy
- [ ] `casual` — short plain language
- [ ] `player_focus` — favourite player lens
- [ ] `studio` / language — later if time

---

## Azure packaging

**Default for deadline:** ACA only (same image locally + Azure).

| Piece | Choice | Done |
|---|---|---|
| Compute | ACA: `touchline-web` + `touchline-insights` | ☐ |
| Model | Foundry, one deployment, env-switched | ☐ |
| Identity | Managed identity / Entra; no keys in repo | ☐ |
| Observability | App Insights + copyable trace ID | ☐ |
| Budget | Alert on resource group | ☐ |
| AKS | Out of scope unless Phase 3 finishes early | ☐ |

Secondary prize lean (pick one in Decision log):

- **Cloud Native** → Event-driven ingest + ACA + observability story
- **Foundry** → Grounding, eval gates, switch-model, receipts UI
- **Multi-Agent** → State + Narrator + Personalizer with shared match state

---

## Non-goals (protect the win)

- Historical international Q&A / WDI geopolitics
- Shipping both AKS and ACA as a product goal
- Auto-eventing from real video
- Fabric lakehouse unless already in flight
- Perfect xG — clear tested heuristics beat fuzzy models
- Chasing all four category prizes

---

## Phased build (track progress)

### Phase 0 — Lock (by 17 Oct)

- [ ] Registered on hackathon site
- [ ] Confirm project timing vs “new after 29 Sep”
- [ ] Fill Decision log: team, secondary prize, transport, multi-agent
- [ ] Freeze scope: live overlay + grounded narratives + 2 modes + ACA

### Phase 1 — Pipeline spine (≈ days 1–3)

- [ ] Event contract: passes / pressure / shots (+ existing types)
- [x] Insights service with tools over playTrack
- [x] React → `POST /api/ask` + `GET /api/suggest` with playhead context
- [x] Grounding validator + evidence IDs
- [x] Unit tests with hand-computed fixtures (`tests/Touchline.Api.Tests`)

### Phase 2 — Product (≈ days 4–6)

- [ ] Insight strip on LiveTracker
- [ ] Mode switcher (analyst / casual minimum)
- [x] Hub feed path (publish, consume, snapshot, SSE)
- [ ] FT/HT recap panel from tool data
- [ ] Optional: second language via prompt param

### Phase 3 — Azure (≈ days 6–8)

- [x] Containerize web (nginx) + API locally via Compose
- [ ] ACA deploy + Foundry keyless
- [ ] Smoke script
- [ ] Trace ID visible in UI
- [ ] IP allow-list / budget alert

### Phase 4 — Proof (≈ days 8–10)

- [ ] Eval cases: in-scope / out-of-scope / grounding fail
- [ ] Docs: `ARCHITECTURE.md`, `METHODS.md`, short `RUNBOOK.md`
- [ ] 2‑minute video filmed and uploaded

### Phase 5 — Submit (by 27 Oct)

- [ ] Public GitHub URL
- [ ] Working demo URL (+ credentials if private)
- [ ] Pitch / description text
- [ ] Video URL (≤2 min)
- [ ] Category selection matches Decision log

---

## Demo video script (~110s)

| Time | Beat | On screen |
|---|---|---|
| 0–15s | Problem: scoreline isn’t the story | Title + broadcast framing |
| 15–35s | Ingest: bridge feed arrives | Pitch updating live |
| 35–60s | Explain: grounded “why” + evidence IDs | Tip + insight strip |
| 60–80s | Personalize: analyst ↔ casual | Same moment, two modes |
| 80–100s | Ship: ACA + Foundry + trace/cost | Env badge |
| 100–110s | Close: name five stages | Checklist graphic |

---

## Open questions

- [ ] Solo or team?
- [ ] Which secondary category prize?
- [ ] How rich do pass/pressure events need to be for a credible demo?
- [ ] Multi-agent this sprint or single grounded agent only?
- [x] Live transport: Event Hubs (emulator locally)

---

## References

- Official rules: https://github.com/microsoft/insidethegamehackathon/blob/main/OFFICIAL%20RULES.md
- Reactor series: https://developer.microsoft.com/en-us/reactor/series/S-1709/
- Execution reference: https://github.com/bbenz/football-results-dashboard
- Hackathon site: https://aka.ms/insidethegame
- Insights tool contracts: [INSIGHTS-TOOLS.md](./INSIGHTS-TOOLS.md)
