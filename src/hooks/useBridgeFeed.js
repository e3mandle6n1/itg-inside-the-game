import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_INTERVAL_MS = 120;
const DEFAULT_BATCH = 1;

function feedRows(source) {
  if (source?.situations?.length) return { key: "situations", rows: source.situations };
  if (source?.events?.length) return { key: "events", rows: source.events };
  return { key: "situations", rows: [] };
}

function shellOf(source) {
  if (!source) return null;
  return {
    ...source,
    status: "Live",
    score: { home: 0, away: 0, ht: source.score?.ht || "0 : 0" },
    events: [],
    situations: [],
    momentum: [],
  };
}

export function useBridgeFeed(sourceMatch, {
  enabled = false,
  intervalMs = DEFAULT_INTERVAL_MS,
  batch = DEFAULT_BATCH,
} = {}) {
  const { key, rows } = useMemo(() => feedRows(sourceMatch), [sourceMatch]);
  const [cursor, setCursor] = useState(0);
  const [running, setRunning] = useState(false);
  const sourceId = sourceMatch?.id;

  useEffect(() => {
    setCursor(0);
    setRunning(enabled);
  }, [enabled, sourceId]);

  useEffect(() => {
    if (!enabled || !running || !rows.length) return undefined;
    if (cursor >= rows.length) return undefined;

    const timer = setTimeout(() => {
      setCursor((current) => Math.min(rows.length, current + Math.max(1, batch)));
    }, Math.max(16, intervalMs));

    return () => clearTimeout(timer);
  }, [enabled, running, cursor, rows, intervalMs, batch]);

  const match = useMemo(() => {
    if (!enabled) return sourceMatch;
    if (!sourceMatch) return null;
    const base = shellOf(sourceMatch);
    const slice = rows.slice(0, cursor);
    if (key === "events") {
      return { ...base, events: slice, situations: [] };
    }
    // Keep events empty while bridging situations so buildPlayTrack
    // does not fall back to the full offline event reel.
    return { ...base, situations: slice, events: [] };
  }, [enabled, sourceMatch, key, rows, cursor]);

  const done = !enabled || (rows.length > 0 && cursor >= rows.length);
  const streaming = enabled && running && !done;

  const pause = useCallback(() => setRunning(false), []);
  const resume = useCallback(() => {
    if (!enabled) return;
    setRunning(true);
  }, [enabled]);

  const restart = useCallback(() => {
    setCursor(0);
    setRunning(enabled);
  }, [enabled]);

  const toggle = useCallback(() => {
    setRunning((current) => !current);
  }, []);

  return {
    match,
    enabled,
    streaming,
    done,
    running,
    received: enabled ? cursor : rows.length,
    total: rows.length,
    pause,
    resume,
    restart,
    toggle,
  };
}
