import { useEffect, useId, useState } from "react";
import { setPieceFunnelBars, setPieceFunnelPolygon } from "../../match";

const STEPS = 3;
const STEP_MS = 160;
const HOLD_MS = 900;
const DRAIN_MS = 380;

export default function SetPieceFunnel({ at, team, kind = "corner", corner }) {
  if (!at) return null;

  const poly = setPieceFunnelPolygon(at, team, kind === "corner" ? "corner" : "freekick");
  if (!poly) return null;

  return <FunnelPaint poly={poly} kind={kind} corner={corner} at={at} />;
}

function FunnelPaint({ poly, kind, corner, at }) {
  const clipId = useId().replace(/:/g, "");
  const bars = setPieceFunnelBars(poly, STEPS);
  const [lit, setLit] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    let raf = 0;
    let start = 0;
    setLit(0);
    setOpacity(1);

    const fillEnd = STEPS * STEP_MS;
    const holdEnd = fillEnd + HOLD_MS;
    const drainEnd = holdEnd + DRAIN_MS;

    const tick = (now) => {
      if (!start) start = now;
      const elapsed = now - start;

      if (elapsed <= fillEnd) {
        setLit(Math.min(STEPS, Math.floor(elapsed / STEP_MS) + 1));
        setOpacity(1);
      } else if (elapsed <= holdEnd) {
        setLit(STEPS);
        setOpacity(1);
      } else if (elapsed <= drainEnd) {
        setLit(STEPS);
        setOpacity(1 - (elapsed - holdEnd) / DRAIN_MS);
      } else {
        setLit(STEPS);
        setOpacity(0);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [poly.apex.x, poly.apex.y, poly.heading, poly.radius, kind]);

  return (
    <div
      className={`setpiece-funnel setpiece-funnel-${kind}`}
      data-corner={corner || undefined}
      data-kind={kind}
      data-steps={lit}
      style={{ "--ax": `${at.x}%`, "--ay": `${at.y}%`, opacity }}
      aria-hidden="true"
    >
      <svg className="setpiece-funnel-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <clipPath id={clipId}>
            <rect x="2" y="2" width="96" height="96" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          {bars.map((bar) => {
            const on = bar.index < lit;
            return (
              <path
                key={bar.index}
                className={`setpiece-funnel-bar${on ? " is-on" : ""}`}
                d={bar.d}
                fill="#ffffff"
                fillOpacity={on ? bar.opacity : 0}
              />
            );
          })}
          <circle
            className="setpiece-funnel-apex"
            cx={poly.apex.x}
            cy={poly.apex.y}
            r="1.05"
            fill="#fff"
            opacity={lit > 0 ? 1 : 0}
          />
        </g>
      </svg>
    </div>
  );
}
