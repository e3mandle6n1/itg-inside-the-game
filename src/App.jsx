import { useEffect, useState } from "react";
import { UiProvider, useUi } from "./context/UiContext.jsx";
import { useHubFeed } from "./hooks/useHubFeed.js";
import { usePlayback } from "./hooks/usePlayback.js";
import DirectorBar from "./components/DirectorBar.jsx";
import ThemeSwitch from "./components/ThemeSwitch.jsx";
import LiveTracker from "./views/LiveTracker.jsx";
import StudioShell from "./views/StudioShell.jsx";

function readParam(name) {
  try {
    return new URLSearchParams(window.location.search).get(name) || "";
  } catch {
    return "";
  }
}

function Tracker({
  match,
  matchId,
  setMatchId,
  catalog,
  feedDone,
  live,
}) {
  const [rate, setRate] = useState(60);
  const [mode, setMode] = useState("casual");
  const [supporting, setSupporting] = useState("neutral");
  const [favoritePlayer, setFavoritePlayer] = useState("");
  const [focusMetric, setFocusMetric] = useState("pressing");
  const [askBusy, setAskBusy] = useState(false);

  const playback = usePlayback(match, { live, feedDone, rate });
  const clock = playback.ended || playback.event?.type === "match_ended"
    ? "FT"
    : playback.event?.clock || (playback.minute != null ? `${playback.minute}'` : "");

  return (
    <>
      <DirectorBar
        playing={playback.playing}
        onToggle={playback.toggle}
        onStartOver={playback.startOver}
        rate={rate}
        onRateChange={setRate}
        catalog={catalog}
        matchId={matchId}
        onMatchChange={setMatchId}
        match={match}
        mode={mode}
        onModeChange={setMode}
        supporting={supporting}
        onSupportingChange={setSupporting}
        favoritePlayer={favoritePlayer}
        onFavoritePlayerChange={setFavoritePlayer}
        focusMetric={focusMetric}
        onFocusMetricChange={setFocusMetric}
        busy={askBusy}
      />
      <StudioShell
        matchId={matchId}
        playIndex={playback.index}
        clock={clock}
        mode={mode}
        supporting={supporting}
        favoritePlayer={favoritePlayer}
        focusMetric={focusMetric}
        onBusyChange={setAskBusy}
      >
        <main>
          <LiveTracker match={match} playback={playback} />
        </main>
      </StudioShell>
    </>
  );
}

function AppShell({ matchId, setMatchId }) {
  const { t } = useUi();
  const [catalog, setCatalog] = useState(null);
  const [bootMatch, setBootMatch] = useState(null);
  const [error, setError] = useState("");
  const [feedReady, setFeedReady] = useState(false);

  const bridge = useHubFeed(matchId, { enabled: feedReady && Boolean(matchId) });

  useEffect(() => {
    fetch("/api/catalog")
      .then((response) => {
        if (!response.ok) throw new Error("Could not load match catalog");
        return response.json();
      })
      .then((data) => {
        setCatalog(data);
        setMatchId((current) => {
          if (current && data.matches.some((row) => row.id === current)) return current;
          return data.defaultId || data.matches[0]?.id || "";
        });
      })
      .catch((err) => setError(err.message));
  }, [setMatchId]);

  useEffect(() => {
    if (!catalog || !matchId) return undefined;
    if (!catalog.matches.some((row) => row.id === matchId)) {
      setError(`Unknown match: ${matchId}`);
      return undefined;
    }

    setError("");
    setBootMatch(null);
    setFeedReady(false);
    let cancelled = false;

    fetch(`/api/matches/${matchId}`)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load ${matchId}`);
        return response.json();
      })
      .then((data) => {
        if (!cancelled) setBootMatch(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    // Refresh should resume the in-memory hub buffer, not restart publish at 0'.
    (async () => {
      try {
        const snapRes = await fetch(`/api/live/${encodeURIComponent(matchId)}/snapshot`);
        const snap = snapRes.ok ? await snapRes.json() : null;
        const hasFeed = Boolean(snap?.fixture) && (snap.received > 0 || snap.publishing);
        if (!hasFeed) {
          const pub = await fetch(`/api/publish/${matchId}`, { method: "POST" });
          if (!pub.ok) throw new Error(`Could not publish ${matchId}`);
        }
        if (!cancelled) setFeedReady(true);
      } catch {
        if (!cancelled) setFeedReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [catalog, matchId]);

  const entry = catalog?.matches.find((row) => row.id === matchId);
  const live = Boolean(bridge.match && bridge.received > 0);
  const match = live ? bridge.match : bootMatch;
  let feedLabel = null;
  if (feedReady) {
    if (!bridge.total) feedLabel = t("bridgeWaiting");
    else if (bridge.done) feedLabel = t("bridgeDone");
    else feedLabel = "Live";
  }

  return (
    <>
      <header className="app-bar">
        <div className="app-bar-row">
          <strong className="brand">Touchline Radar</strong>
          <div className="app-bar-controls">
            <div className="app-bar-tools" role="group" aria-label="Display">
              <ThemeSwitch />
            </div>
          </div>
        </div>
        {match ? (
          <p>
            {match.competition} · {match.home.name} v {match.away.name}
            {feedLabel ? ` · ${feedLabel}` : ""}
          </p>
        ) : entry ? (
          <p>{entry.title}{feedLabel ? ` · ${feedLabel}` : ""}</p>
        ) : null}
      </header>
      {error ? <p className="error">{error}</p> : null}
      {!error && !match ? <p className="loading">{t("loading")}</p> : null}
      {match ? (
        <Tracker
          key={`${matchId}-${live ? "live" : "boot"}`}
          match={match}
          matchId={matchId}
          setMatchId={setMatchId}
          catalog={catalog}
          live={live}
          feedDone={!live || bridge.done}
        />
      ) : null}
    </>
  );
}

export default function App() {
  const [matchId, setMatchId] = useState(() => readParam("match"));

  return (
    <UiProvider matchId={matchId}>
      <AppShell matchId={matchId} setMatchId={setMatchId} />
    </UiProvider>
  );
}
