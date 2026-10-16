import { clockLabel, setPieceFunnelPolygon } from "../../match";

export default function SetPieceTip({ match, event, at, kind = "corner", taken = false, corner }) {
  if (!at || !event) return null;
  const team = event.team === "away" ? match.away : match.home;
  const clock = clockLabel(event);
  const poly = setPieceFunnelPolygon(at, event.team, kind === "corner" ? "corner" : "freekick");
  const tipSide = poly?.tipSide || (at.x < 50 ? "right" : "left");

  const eventLabel = kind === "freekick"
    ? (taken ? "Freekick" : "Freekick awarded")
    : (taken ? "Corner" : "Corner awarded");

  return (
    <div
      className={`setpiece-tip setpiece-tip-${tipSide}${taken ? " is-take" : " is-award"}`}
      style={{ left: `${at.x}%`, top: `${at.y}%`, "--tone": team.color }}
      data-corner={corner || undefined}
      data-kind={kind}
    >
      <div className="setpiece-tip-card">
        <div className="setpiece-tip-meta">
          {eventLabel}{clock ? ` · ${clock}` : ""}
        </div>
        <div className="setpiece-tip-team">{team.name}</div>
      </div>
      <span className="setpiece-tip-caret" aria-hidden="true" />
    </div>
  );
}
