import { clockLabel, EVENT_LABELS, tipSide } from "../../match";

export default function GoalTip({ match, event, at, variant = "rich" }) {
  if (!at || !event) return null;
  const team = event.team === "away" ? match.away : match.home;
  const clock = clockLabel(event);
  const player = String(event.player || "").trim();
  const side = tipSide(at, event.team);
  const title = variant === "rich" && player ? player : team.name;
  const averages = goalAverages(match);

  return (
    <OriginCallout at={at} side={side} className={`goal-tip-${variant}`} data-variant={variant}>
      <div className="goal-tip-banner">{title}</div>
      <div className="goal-tip-body">
        <span className="goal-tip-event">Goal{clock ? ` · ${clock}` : ""}</span>
        {variant === "rich" && averages ? (
          <div className="goal-tip-stats">
            <div className="goal-tip-stats-label">Goals per match</div>
            <div className="goal-tip-stats-row">
              <div className="goal-tip-side">
                <span className="goal-tip-kit" style={{ background: match.home.color }} />
                <span className="goal-tip-abbr">{match.home.short}</span>
                <strong>{averages.home}</strong>
              </div>
              <GoalsDonut
                home={averages.home}
                away={averages.away}
                homeColor={match.home.color}
                awayColor={match.away.color}
              />
              <div className="goal-tip-side is-away">
                <strong>{averages.away}</strong>
                <span className="goal-tip-abbr">{match.away.short}</span>
                <span className="goal-tip-kit" style={{ background: match.away.color }} />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </OriginCallout>
  );
}

export function ShotTip({ match, event, at }) {
  if (!at || !event) return null;
  const team = event.team === "away" ? match.away : match.home;
  const clock = clockLabel(event);
  const player = String(event.player || "").trim();
  const kind = event.incident || event.type;
  const label = EVENT_LABELS[kind] || "Shot";
  const kit = team.color || "#152038";

  return (
    <OriginCallout
      at={at}
      side={tipSide(at, event.team)}
      className="goal-tip-simple shot-tip"
      style={{ "--shot-kit": kit }}
      data-kind={kind}
      caretClass="shot-tip-caret"
    >
      <div className="goal-tip-banner shot-tip-banner">{player || team.name}</div>
      <div className="goal-tip-body">
        <span className="goal-tip-event">
          {label}{clock ? ` · ${clock}` : ""}
        </span>
      </div>
    </OriginCallout>
  );
}

export function SaveTip({ match, event, at }) {
  if (!at || !event) return null;
  const team = event.team === "away" ? match.away : match.home;
  const clock = clockLabel(event);
  const kit = team.color || "#152038";

  return (
    <OriginCallout
      at={at}
      side={tipSide(at, event.team)}
      className="goal-tip-simple shot-tip save-tip"
      style={{ "--shot-kit": kit }}
      caretClass="shot-tip-caret"
    >
      <div className="goal-tip-banner shot-tip-banner">{team.name}</div>
      <div className="goal-tip-body">
        <span className="goal-tip-event">
          Goalkeeper save{clock ? ` · ${clock}` : ""}
        </span>
      </div>
    </OriginCallout>
  );
}

export function KickoffTip({ match, event }) {
  if (!event) return null;
  const kind = event.incident || event.type;
  const team = event.team === "away" ? match.away : event.team === "home" ? match.home : null;
  const clock = clockLabel(event);
  const isHalf = kind === "periodstart";
  const title = isHalf ? (clock || "Kick-off") : (team?.name || "Kick-off");
  const detail = isHalf ? "Kick-off" : `Kick-off${clock ? ` · ${clock}` : ""}`;
  const at = { x: 50, y: 50 };

  return (
    <OriginCallout
      at={at}
      side="left"
      className="goal-tip-simple kickoff-tip"
      originClass="kickoff-spot"
      data-kind={kind}
    >
      <div className="goal-tip-banner">{title}</div>
      <div className="goal-tip-body">
        <span className="goal-tip-event">{detail}</span>
      </div>
    </OriginCallout>
  );
}

function OriginCallout({
  at,
  side,
  className = "",
  style,
  originClass = "",
  caretClass = "",
  children,
  ...rest
}) {
  return (
    <>
      <span
        className={`goal-tip-origin ${originClass}`.trim()}
        style={{ left: `${at.x}%`, top: `${at.y}%` }}
        aria-hidden="true"
      />
      <div
        className={`goal-tip goal-tip-${side} ${className}`.trim()}
        style={{ left: `${at.x}%`, top: `${at.y}%`, ...(style || {}) }}
        {...rest}
      >
        <div className="goal-tip-card">{children}</div>
        <span className={`goal-tip-caret ${caretClass}`.trim()} aria-hidden="true" />
      </div>
    </>
  );
}

function goalAverages(match) {
  const home = Number(match?.averages?.goalsPerMatch?.home);
  const away = Number(match?.averages?.goalsPerMatch?.away);
  if (Number.isFinite(home) && Number.isFinite(away)) {
    return { home: home.toFixed(1), away: away.toFixed(1) };
  }
  return { home: "2.4", away: "1.7" };
}

function GoalsDonut({ home, away, homeColor, awayColor }) {
  const h = Number(home) || 0;
  const a = Number(away) || 0;
  const total = Math.max(0.01, h + a);
  const homeFrac = h / total;
  const r = 10;
  const c = 2 * Math.PI * r;
  const homeLen = c * homeFrac;
  const awayLen = c - homeLen;

  return (
    <svg className="goal-tip-donut" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true">
      <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
      <circle
        cx="14"
        cy="14"
        r={r}
        fill="none"
        stroke={homeColor || "#fff"}
        strokeWidth="4"
        strokeDasharray={`${homeLen.toFixed(2)} ${c.toFixed(2)}`}
        strokeDashoffset={(c * 0.25).toFixed(2)}
        strokeLinecap="butt"
      />
      <circle
        cx="14"
        cy="14"
        r={r}
        fill="none"
        stroke={awayColor || "#888"}
        strokeWidth="4"
        strokeDasharray={`${awayLen.toFixed(2)} ${c.toFixed(2)}`}
        strokeDashoffset={(c * 0.25 - homeLen).toFixed(2)}
        strokeLinecap="butt"
      />
    </svg>
  );
}
