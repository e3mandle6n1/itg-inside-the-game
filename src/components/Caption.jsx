import { iconFor, PHASE_LABELS } from "../match";

export default function Caption({ event, match }) {
  if (!event) return null;

  const teamName = event.team === "away"
    ? match?.away?.name
    : event.team === "home"
      ? match?.home?.name
      : "";
  const phaseLabel = PHASE_LABELS[event.phase];
  const text = event.text
    || (phaseLabel && teamName ? `${teamName} · ${phaseLabel}` : phaseLabel)
    || event.type;

  return (
    <p className="caption">
      <img src={`/icons/${iconFor(event)}.svg`} alt="" />
      <span>{text}</span>
    </p>
  );
}
