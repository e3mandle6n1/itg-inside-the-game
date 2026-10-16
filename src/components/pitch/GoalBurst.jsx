export default function GoalBurst({ event }) {
  if (!event) return null;

  return (
    <div
      className="goal-burst"
      data-side={event.team === "away" ? "away" : "home"}
      role="status"
    >
      <div className="goal-burst-badge">
        <img className="goal-burst-ball" src="/icons/goal.svg" alt="" />
        <span>Goal</span>
      </div>
    </div>
  );
}
