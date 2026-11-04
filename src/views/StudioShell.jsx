import { useEffect, useRef, useState } from "react";
import SuggestPanel from "../components/studio/SuggestPanel.jsx";
import ReceiptRail from "../components/studio/ReceiptRail.jsx";
import { useUi } from "../context/UiContext.jsx";
import { askQuestion, fetchSuggestions, receiptFromAsk } from "../studio/askApi.js";

/** Playhead ticks every few hundred ms; re-suggest only once it settles. */
const SUGGEST_SETTLE_MS = 1500;

export default function StudioShell({
  matchId,
  playIndex = 0,
  clock = "",
  mode = "casual",
  supporting = "neutral",
  favoritePlayer = "",
  focusMetric = "auto",
  onBusyChange,
  children,
}) {
  const { lang } = useUi();
  const [suggestions, setSuggestions] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const playIndexRef = useRef(playIndex);
  const clockRef = useRef(clock);
  const prefsRef = useRef({ mode, supporting, favoritePlayer, focusMetric, lang });
  playIndexRef.current = playIndex;
  clockRef.current = clock;
  prefsRef.current = { mode, supporting, favoritePlayer, focusMetric, lang };

  useEffect(() => {
    onBusyChange?.(busy);
  }, [busy, onBusyChange]);

  async function runAsk(question, id) {
    if (!matchId || !question?.trim()) return;
    const prefs = prefsRef.current;
    setBusy(true);
    setError("");
    if (id) setActiveId(id);
    try {
      const ask = await askQuestion({
        matchId,
        playIndex: playIndexRef.current,
        question: question.trim(),
        mode: prefs.mode,
        supporting: prefs.supporting,
        focusMetric: prefs.focusMetric,
        language: prefs.lang,
        favoritePlayer: prefs.favoritePlayer || undefined,
      });
      setReceipt(receiptFromAsk(ask, clockRef.current));
    } catch (err) {
      setError(err.message || "ask failed");
    } finally {
      setBusy(false);
    }
  }

  // New match: fresh suggestions and one opening answer. Director prefs are
  // read at ask time, so toggling them does not spend a model call.
  useEffect(() => {
    if (!matchId) return undefined;
    let cancelled = false;
    setReceipt(null);
    setSuggestions([]);
    setActiveId("");
    fetchSuggestions(matchId, playIndexRef.current)
      .then((data) => {
        if (cancelled) return;
        const rows = data.suggestions || [];
        setSuggestions(rows);
        const first = rows[0];
        if (first) runAsk(first.prompt, first.id);
      })
      .catch(() => {
        if (!cancelled) setSuggestions([]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // Playhead moved: re-suggest once it settles. Suggestions are deterministic
  // (no model call) so this is cheap; the open answer stays until asked again.
  useEffect(() => {
    if (!matchId) return undefined;
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchSuggestions(matchId, playIndex)
        .then((data) => {
          if (!cancelled) setSuggestions(data.suggestions || []);
        })
        .catch(() => {});
    }, SUGGEST_SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [matchId, playIndex]);

  return (
    <div className="studio">
      <SuggestPanel
        suggestions={suggestions}
        activeId={activeId}
        busy={busy}
        onSelect={(row) => {
          setQuery("");
          runAsk(row.prompt, row.id);
        }}
        query={query}
        onQueryChange={setQuery}
        onSubmitQuery={() => runAsk(query, "freeform")}
      />
      <div className="studio-center">
        {children}
      </div>
      <ReceiptRail
        receipt={receipt}
        busy={busy}
        error={error}
        clock={clock}
      />
    </div>
  );
}
