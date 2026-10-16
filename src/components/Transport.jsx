export default function Transport({
  clock,
  index,
  max,
  playing,
  onToggle,
  onSeek,
  live = false,
  bridge = null,
}) {
  return (
    <footer className="transport">
      <button type="button" onClick={onToggle}>{playing ? "Pause" : "Play"}</button>
      {live && bridge ? (
        <button
          type="button"
          className="transport-feed"
          onClick={bridge.running ? bridge.pause : bridge.resume}
          disabled={bridge.done}
        >
          {bridge.done ? "Feed done" : bridge.running ? "Hold feed" : "Resume feed"}
        </button>
      ) : null}
      <span className="clock">{clock}</span>
      {live && bridge ? (
        <span className="feed-meter" aria-label="Bridge buffer">
          {bridge.received}/{bridge.total}
        </span>
      ) : null}
      <input
        className="scrub"
        type="range"
        min={0}
        max={Math.max(0, max)}
        value={Math.min(index, Math.max(0, max))}
        aria-label="Match minute"
        onChange={(event) => onSeek(Number(event.target.value))}
      />
    </footer>
  );
}
