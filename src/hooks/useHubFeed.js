import { useEffect, useReducer, useRef } from "react";
import { feedMatch } from "../feed.js";

const empty = {
  fixture: null,
  total: 0,
  situations: [],
  held: [],
  running: true,
  error: "",
  stalled: false,
};

function reduce(state, action) {
  if (action.type === "reset") return empty;
  if (action.type === "fixture") {
    // Snapshot hydrate brings its own situations. A catch-up fixture after that
    // keeps them so a refresh does not dump the user at 0'. A republish clears.
    const keep = action.preserve && state.situations.length > 0;
    return {
      ...state,
      fixture: action.fixture,
      total: action.total,
      situations: action.situations || (keep ? state.situations : []),
      held: keep ? state.held : [],
      error: "",
      stalled: false,
    };
  }
  if (action.type === "situations") {
    const batch = action.situations || [];
    if (!batch.length) return state;
    if (!state.running) return { ...state, held: state.held.concat(batch), stalled: false };
    return { ...state, situations: state.situations.concat(batch), stalled: false };
  }
  if (action.type === "pause") return { ...state, running: false };
  if (action.type === "resume") {
    return { ...state, running: true, situations: state.situations.concat(state.held), held: [] };
  }
  if (action.type === "stalled") {
    if (state.stalled && state.fixture) return state;
    if (!state.fixture) {
      return { ...state, stalled: true, error: action.error || "Feed is not reachable." };
    }
    return {
      ...state,
      stalled: true,
      error: state.situations.length ? "" : (action.error || "Feed stalled."),
    };
  }
  if (action.type === "error" && !state.fixture) return { ...state, error: action.error };
  return state;
}

export function useHubFeed(matchId, { enabled = false } = {}) {
  const [state, dispatch] = useReducer(reduce, empty);
  const pendingRef = useRef([]);
  const flushTimerRef = useRef(0);
  const lastSeqRef = useRef(0);

  useEffect(() => {
    dispatch({ type: "reset" });
    lastSeqRef.current = 0;
    if (!enabled || !matchId) return undefined;

    let closed = false;
    let source;
    let reconnectTimer = 0;
    let attempts = 0;

    const flush = () => {
      flushTimerRef.current = 0;
      if (!pendingRef.current.length) return;
      const batch = pendingRef.current;
      pendingRef.current = [];
      dispatch({ type: "situations", situations: batch });
    };

    const queueSituation = (situation) => {
      pendingRef.current.push(situation);
      if (flushTimerRef.current) return;
      flushTimerRef.current = window.setTimeout(flush, 80);
    };

    const connect = () => {
      if (closed) return;
      source = new EventSource(`/live/${encodeURIComponent(matchId)}`);
      source.addEventListener("fixture", (event) => {
        attempts = 0;
        const message = JSON.parse(event.data);
        const preserve = lastSeqRef.current > 0;
        if (!preserve) {
          pendingRef.current = [];
          if (flushTimerRef.current) {
            window.clearTimeout(flushTimerRef.current);
            flushTimerRef.current = 0;
          }
        }
        dispatch({
          type: "fixture",
          fixture: message.fixture,
          total: message.situationCount,
          preserve,
        });
      });
      source.addEventListener("situation", (event) => {
        attempts = 0;
        const message = JSON.parse(event.data);
        const seq = Number(message.seq) || 0;
        // Skip backlog already applied from snapshot (seq is 1-based for situations).
        if (seq > 0 && seq <= lastSeqRef.current) return;
        if (seq > lastSeqRef.current) lastSeqRef.current = seq;
        if (message.situation) queueSituation(message.situation);
      });
      source.onerror = () => {
        source.close();
        flush();
        dispatch({ type: "stalled", error: "Feed is not reachable." });
        if (closed) return;
        attempts += 1;
        const wait = Math.min(8000, 500 * attempts);
        reconnectTimer = window.setTimeout(connect, wait);
      };
    };

    (async () => {
      try {
        const response = await fetch(`/api/live/${encodeURIComponent(matchId)}/snapshot`);
        if (response.ok) {
          const snap = await response.json();
          if (closed) return;
          if (snap.fixture) {
            const situations = snap.situations || [];
            lastSeqRef.current = snap.received || situations.length;
            dispatch({
              type: "fixture",
              fixture: snap.fixture,
              total: snap.situationCount || 0,
              situations,
            });
          }
        }
      } catch {
        // SSE still connects; live ticks may arrive without a snapshot.
      }
      if (!closed) connect();
    })();

    return () => {
      closed = true;
      window.clearTimeout(reconnectTimer);
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = 0;
      pendingRef.current = [];
      source?.close();
    };
  }, [enabled, matchId]);

  const received = state.situations.length;
  const done = (state.total > 0 && received >= state.total && state.held.length === 0)
    || (state.stalled && received > 0);

  return {
    match: feedMatch({ fixture: state.fixture, situations: state.situations }),
    error: state.error,
    streaming: enabled && state.running && state.fixture && !done,
    done,
    running: state.running,
    received,
    total: state.total,
    pause: () => dispatch({ type: "pause" }),
    resume: () => dispatch({ type: "resume" }),
  };
}
