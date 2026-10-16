import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSmoothBall } from "../../hooks/useSmoothBall.js";

function curvePoints(from, to, steps = 10) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const lift = (from.y < 50 ? 1 : -1) * Math.min(10, Math.hypot(to.x - from.x, to.y - from.y) * 0.12);
  const cx = mx;
  const cy = my + lift;
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const u = 1 - t;
    pts.push({
      x: u * u * from.x + 2 * u * t * cx + t * t * to.x,
      y: u * u * from.y + 2 * u * t * cy + t * t * to.y,
    });
  }
  return pts;
}

export default function BallSpot({
  ball,
  playing,
  team,
  muted,
  shotOrigin = null,
  goalFlight = false,
  shotFlight = false,
  cornerFlight = false,
}) {
  const posRef = useRef(null);
  const [trail, setTrail] = useState([]);
  const [pingKey, setPingKey] = useState(0);
  const settled = useRef(true);
  const flightKey = useRef("");
  const dashFlight = goalFlight || shotFlight;
  const curved = dashFlight || cornerFlight;

  const flightCurve = useMemo(() => {
    if (!curved || !shotOrigin) return null;
    return curvePoints(shotOrigin, ball, cornerFlight ? 14 : 12);
  }, [curved, cornerFlight, shotOrigin, ball.x, ball.y]);

  useEffect(() => {
    if (!curved) {
      flightKey.current = "";
      setTrail([]);
      return;
    }
    if (!shotOrigin || !flightCurve) return;
    const tag = cornerFlight ? "c" : goalFlight ? "g" : "s";
    const key = `${tag}:${shotOrigin.x},${shotOrigin.y}->${ball.x},${ball.y}`;
    if (flightKey.current === key) return;
    flightKey.current = key;
    setTrail(flightCurve);
    settled.current = false;
  }, [curved, cornerFlight, goalFlight, shotOrigin, flightCurve, ball.x, ball.y]);

  const onPos = useCallback((pos) => {
    const gapToTarget = Math.hypot(ball.x - pos.x, ball.y - pos.y);

    if (gapToTarget > 1.2) {
      settled.current = false;
    } else if (!settled.current && gapToTarget < 0.35) {
      settled.current = true;
      setPingKey((key) => key + 1);
    }
  }, [ball.x, ball.y]);

  useSmoothBall(posRef, ball, playing || curved, onPos);

  useEffect(() => {
    settled.current = true;
  }, [team]);

  const points = trail.map((pt) => `${pt.x},${pt.y}`).join(" ");

  return (
    <div
      className={`bspot${muted ? " is-muted" : ""}${goalFlight ? " is-goal" : ""}${shotFlight ? " is-shot" : ""}${cornerFlight ? " is-corner" : ""}`}
    >
      {curved && trail.length > 1 && (
        <svg className="bspot-trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            className={`bspot-trail-line${dashFlight ? " is-goal-flight" : ""}${cornerFlight ? " is-corner-flight" : ""}`}
            points={points}
            fill="none"
            stroke="#fff"
            strokeOpacity={cornerFlight ? "0.7" : "0.72"}
            strokeWidth={cornerFlight ? "0.7" : "0.65"}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={dashFlight ? "3.2 2" : undefined}
          />
        </svg>
      )}
      <div ref={posRef} className="bspot-pos">
        <span
          key={pingKey}
          className={`bspot-ping${cornerFlight ? " is-corner-ping" : ""}`}
          aria-hidden="true"
        />
        <img className="ball" src="/icons/pitch-ball.svg" alt="" />
      </div>
    </div>
  );
}
