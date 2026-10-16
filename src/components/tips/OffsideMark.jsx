import { clampPitch, clockLabel, family } from "../../match";

export default function OffsideMark({ match, event }) {
  if (!event?.team || event.x == null) return null;

  const team = event.team === "away" ? match.away : match.home;
  const lineX = clampPitch(event.x);
  const ballY = event.y != null ? clampPitch(event.y) : 50;
  const towardRight = event.team === "home";
  const zone = towardRight
    ? { x: lineX, width: Math.max(4, 100 - lineX) }
    : { x: 0, width: Math.max(4, lineX) };
  const tipLeft = towardRight
    ? Math.min(78, lineX + 2)
    : Math.max(4, lineX - 28);
  const player = family(event.player);
  const clock = clockLabel(event);

  return (
    <div className="offside-mark" data-side={event.team} aria-hidden="true">
      <svg className="offside-mark-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient
            id={`offsideZone-${event.team}`}
            gradientUnits="userSpaceOnUse"
            x1={lineX}
            y1="50"
            x2={towardRight ? 100 : 0}
            y2="50"
          >
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="55%" stopColor="#f5f7fa" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#1c2228" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect
          className="offside-zone"
          x={zone.x}
          y="0"
          width={zone.width}
          height="100"
          fill={`url(#offsideZone-${event.team})`}
        />
        <line
          className="offside-line"
          x1={lineX}
          y1="2"
          x2={lineX}
          y2="98"
          stroke="#fff"
          strokeWidth="0.55"
          strokeDasharray="2.2 1.6"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          className="offside-flag-dot"
          cx={lineX}
          cy={ballY}
          r="1.35"
          fill="#fff"
        />
      </svg>

      <div
        className={`offside-tip${towardRight ? " is-right" : " is-left"}`}
        style={{ left: `${tipLeft}%`, top: `${Math.max(12, Math.min(70, ballY - 8))}%`, "--tone": team.color }}
      >
        <div className="offside-tip-banner" style={{ background: team.color }}>{team.name}</div>
        <div className="offside-tip-body">
          <img src="/icons/offside.svg" alt="" />
          <div>
            {player ? <strong>{player}</strong> : null}
            <span>Offside{clock ? ` · ${clock}` : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
