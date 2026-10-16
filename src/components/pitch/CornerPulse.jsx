export default function CornerPulse({ at }) {
  if (!at) return null;

  return (
    <span
      className="corner-pulse"
      style={{ left: `${at.x}%`, top: `${at.y}%` }}
      aria-hidden="true"
    />
  );
}
