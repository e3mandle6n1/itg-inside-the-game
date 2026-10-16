import {
  clockLabel,
  family,
  hasSitover,
  iconFor,
  incidentTitle,
} from "../../match";

function teamOf(match, side) {
  if (side === "away") return match.away;
  return match.home;
}

function playerLine(event) {
  const raw = String(event?.player || "").trim();
  if (!raw) return "";
  const kind = event.incident || event.type;
  if (kind === "substitution") {
    const [off, on] = raw.split("/").map((part) => part.trim());
    if (off && on) return `${family(on)} on · ${family(off)} off`;
  }
  return family(raw);
}

export default function PitchIncident({ match, event, score }) {
  if (!hasSitover(event)) return null;

  const kind = event.incident || event.type;
  const team = teamOf(match, event.team);
  const clock = clockLabel(event);
  const title = incidentTitle({ ...event, type: kind });
  const player = playerLine(event);
  const side = event.team === "away" ? "away" : "home";

  if (kind === "goal") {
    return (
      <div className="sitover sitover-goal" data-side={side}>
        <div className="sitover-score">
          <span>{score.home}</span>
          <span className="sitover-sep" aria-hidden="true">
            <i /><i />
          </span>
          <span>{score.away}</span>
        </div>
        <div className="sitover-goal-meta">
          <span className="sitover-team">{team.name}</span>
          {clock ? <span className="sitover-dot">·</span> : null}
          {clock ? <span className="sitover-clock">{clock}</span> : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`sitover sitover-strip sitover-${side}`} data-side={side}>
      <div className="sitover-strip-banner" style={{ background: team.color }}>
        {team.name}
      </div>
      <div className="sitover-strip-body">
        <img src={`/icons/${iconFor(event)}.svg`} alt="" />
        <div className="sitover-strip-copy">
          <strong>
            {title}
            {clock ? ` · ${clock}` : ""}
          </strong>
          {player ? <span>{player}</span> : null}
        </div>
      </div>
    </div>
  );
}
