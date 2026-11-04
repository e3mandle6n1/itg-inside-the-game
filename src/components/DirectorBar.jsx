import { useMemo } from "react";
import { useUi } from "../context/UiContext.jsx";
import { LOCALES } from "../i18n/locales.js";

const SPEEDS = [
  { id: 1, label: "1x" },
  { id: 4, label: "4x" },
  { id: 15, label: "15x" },
  { id: 60, label: "60x" },
];

const FOCUS = [
  { id: "auto", labelKey: "focusAuto" },
  { id: "pressing", labelKey: "focusPressing" },
  { id: "shots", labelKey: "focusShots" },
  { id: "possession", labelKey: "focusPossession" },
  { id: "key_moment", labelKey: "focusKeyMoment" },
];

function lineupPlayers(match) {
  const out = [];
  const seen = new Set();
  for (const side of ["home", "away"]) {
    const xi = match?.lineups?.[side]?.xi || [];
    for (const row of xi) {
      const name = row?.name;
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push({ name, side });
    }
  }
  return out;
}

function Field({ label, children }) {
  return (
    <label className="director-field">
      <span className="director-field-label">{label}</span>
      {children}
    </label>
  );
}

export default function DirectorBar({
  playing,
  onToggle,
  onStartOver,
  rate,
  onRateChange,
  catalog,
  matchId,
  onMatchChange,
  match,
  mode,
  onModeChange,
  supporting,
  onSupportingChange,
  favoritePlayer,
  onFavoritePlayerChange,
  focusMetric,
  onFocusMetricChange,
  busy = false,
}) {
  const { t, lang, setLang } = useUi();
  const players = useMemo(() => lineupPlayers(match), [match]);
  const homeName = match?.home?.name || t("supportHome");
  const awayName = match?.away?.name || t("supportAway");

  return (
    <div className="director-bar" role="toolbar" aria-label={t("directorBar")}>
      <div className="director-transport">
        <button type="button" className="director-btn director-btn-play" onClick={onToggle}>
          {playing ? t("pause") : t("play")}
        </button>
        <button type="button" className="director-btn" onClick={onStartOver}>
          {t("startOver")}
        </button>
      </div>

      <div className="director-fields">
        <Field label={t("speed")}>
          <select
            value={rate}
            onChange={(e) => onRateChange(Number(e.target.value))}
            aria-label={t("speed")}
          >
            {SPEEDS.map((row) => (
              <option key={row.id} value={row.id}>{row.label}</option>
            ))}
          </select>
        </Field>

        {catalog ? (
          <Field label={t("match")}>
            <select
              value={matchId}
              onChange={(e) => onMatchChange(e.target.value)}
              aria-label={t("match")}
            >
              {catalog.matches.map((row) => (
                <option key={row.id} value={row.id}>{row.title}</option>
              ))}
            </select>
          </Field>
        ) : null}

        <Field label={t("viewer")}>
          <select
            value={mode}
            disabled={busy}
            onChange={(e) => onModeChange(e.target.value)}
            aria-label={t("viewer")}
          >
            <option value="casual">{t("modeCasualFan")}</option>
            <option value="analyst">{t("modeAnalyst")}</option>
          </select>
        </Field>

        <Field label={t("supporting")}>
          <select
            value={supporting}
            disabled={busy}
            onChange={(e) => onSupportingChange(e.target.value)}
            aria-label={t("supporting")}
          >
            <option value="neutral">{t("supportNeutral")}</option>
            <option value="home">{homeName}</option>
            <option value="away">{awayName}</option>
          </select>
        </Field>

        <Field label={t("followPlayer")}>
          <select
            value={favoritePlayer || ""}
            disabled={busy}
            onChange={(e) => onFavoritePlayerChange(e.target.value)}
            aria-label={t("followPlayer")}
          >
            <option value="">{t("followNobody")}</option>
            {players.map((row) => (
              <option key={row.name} value={row.name}>
                {row.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("focusMetric")}>
          <select
            value={focusMetric}
            disabled={busy}
            onChange={(e) => onFocusMetricChange(e.target.value)}
            aria-label={t("focusMetric")}
          >
            {FOCUS.map((row) => (
              <option key={row.id} value={row.id}>{t(row.labelKey)}</option>
            ))}
          </select>
        </Field>

        <Field label={t("language")}>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            aria-label={t("language")}
          >
            {LOCALES.map((row) => (
              <option key={row.id} value={row.id}>
                {row.flag} {row.name}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}
