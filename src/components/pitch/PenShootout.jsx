import { shootoutSpot } from "../../match";

export function PenAnnounce({ icon, title, subtitle, jersey }) {
  return (
    <div className="pen-announce" role="status">
      {jersey ? (
        <img className="pen-announce-jersey" src={jersey} alt="" />
      ) : (
        <img className="pen-announce-icon" src={icon || "/icons/goal.svg"} alt="" />
      )}
      <strong className="pen-announce-title">{title}</strong>
      {subtitle ? <span className="pen-announce-sub">{subtitle}</span> : null}
    </div>
  );
}

export function PenBanner() {
  return (
    <div className="pen-banner" aria-hidden="true">
      Penalty Shootout
    </div>
  );
}

function PenMark({ result, color }) {
  if (result === "scored") {
    return (
      <span className="pen-dot is-scored" style={{ "--pen-mark": color }} aria-hidden="true">
        <svg viewBox="0 0 16 16" width="12" height="12">
          <path
            d="M3.5 8.2 L6.6 11.2 L12.5 4.8"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  if (result === "missed") {
    return (
      <span className="pen-dot is-missed" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="11" height="11">
          <path
            d="M4 4 L12 12 M12 4 L4 12"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span
      className="pen-dot is-empty"
      style={{ "--pen-outline": color }}
      aria-hidden="true"
    />
  );
}

export function PenTally({ match, tally }) {
  if (!tally) return null;
  const sides = [
    {
      key: "home",
      team: match.home,
      results: tally.home,
      jersey: match.home.crest || "/icons/jersey-home.svg",
    },
    {
      key: "away",
      team: match.away,
      results: tally.away,
      jersey: match.away.crest || "/icons/jersey-away.svg",
    },
  ];

  return (
    <div className="pen-tally" role="group" aria-label="Penalty shootout">
      {sides.map((side) => (
        <div key={side.key} className={`pen-tally-side is-${side.key}`}>
          <img className="pen-tally-jersey" src={side.jersey} alt="" />
          <div className="pen-tally-cols">
            {side.results.map((result, index) => (
              <div key={`${side.key}-${index}`} className="pen-tally-col">
                <PenMark result={result} color={side.team.color || "#fff"} />
                <span className="pen-tally-num">
                  {tally.suddenDeath ? (tally.round || index + 1) : index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PenKickTip({ match, event, at, mode = "player" }) {
  if (!event || !at) return null;
  const team = event.team === "away" ? match.away : match.home;
  const player = String(event.player || "").trim() || team.name;
  const kit = team.color || "#152038";
  const side = at.x < 50 ? "right" : "left";
  const scored = mode === "scored";
  const missed = mode === "missed";
  const result = scored ? "Scored" : missed ? "Missed" : null;

  return (
    <>
      <span
        className="goal-tip-origin pen-kick-origin"
        style={{ left: `${at.x}%`, top: `${at.y}%` }}
        aria-hidden="true"
      />
      <div
        className={`goal-tip goal-tip-${side} pen-kick-tip${result ? " has-result" : ""}`}
        style={{ left: `${at.x}%`, top: `${at.y}%`, "--pen-kit": kit }}
        data-result={result || "player"}
      >
        <div className="goal-tip-card pen-kick-card">
          {result ? <div className="pen-kick-result">{result}</div> : null}
          <div className="goal-tip-banner pen-kick-player">{player}</div>
        </div>
        <span className="goal-tip-caret pen-kick-caret" aria-hidden="true" />
      </div>
    </>
  );
}

export function penKickAt() {
  return shootoutSpot();
}
