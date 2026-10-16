import { useEffect, useState } from "react";
import { cardColour, clockLabel, tipSide } from "../../match";

export default function CardTip({ match, event, at, playing = false }) {
  const colour = cardColour(event);
  const stage = useCardStage(colour, playing, event);

  if (!at || !event) return null;

  const team = event.team === "away" ? match.away : match.home;
  const clock = clockLabel(event);
  const player = String(event.player || "").trim();
  const side = tipSide(at, event.team);

  return (
    <>
      <span
        className="goal-tip-origin card-tip-origin"
        style={{ left: `${at.x}%`, top: `${at.y}%` }}
        aria-hidden="true"
      />
      <div
        className={`goal-tip goal-tip-${side} card-tip card-tip-${colour}`}
        style={{ left: `${at.x}%`, top: `${at.y}%` }}
        data-colour={colour}
        data-stage={stage}
      >
        <div className="goal-tip-card card-tip-panel">
          <div className="goal-tip-banner">{player || team.name}</div>
          <div className="card-tip-body">
            <div className="card-tip-glyphs" aria-hidden="true">
              {colour === "yellow" ? <span className="card-glyph is-yellow is-in" /> : null}
              {colour === "red" ? <span className="card-glyph is-red is-in" /> : null}
              {colour === "yellowred" ? (
                <>
                  {(stage === "yellow" || stage === "both") ? (
                    <span className="card-glyph is-yellow is-in" />
                  ) : null}
                  {stage === "both" ? <span className="card-glyph is-red is-in" /> : null}
                </>
              ) : null}
            </div>
            <div className="card-tip-copy">
              <strong>
                {stageLabel(colour, stage)}
                {clock ? ` · ${clock}` : ""}
              </strong>
              {player ? <span>{team.name}</span> : null}
            </div>
          </div>
        </div>
        <span className="goal-tip-caret" aria-hidden="true" />
      </div>
    </>
  );
}

function stageLabel(colour, stage) {
  if (colour === "yellowred") {
    if (stage === "yellow") return "Yellow card";
    return "Second yellow";
  }
  if (colour === "red") return "Red card";
  return "Yellow card";
}

function useCardStage(colour, playing, event) {
  const key = `${event?.minute}-${event?.added}-${event?.player}-${event?.card}`;
  const initial = colour === "yellowred" ? (playing ? "yellow" : "both") : colour;
  const [stage, setStage] = useState(initial);

  useEffect(() => {
    if (colour !== "yellowred") {
      setStage(colour);
      return undefined;
    }
    if (!playing) {
      setStage("both");
      return undefined;
    }
    setStage("yellow");
    const toBoth = setTimeout(() => setStage("both"), 750);
    return () => clearTimeout(toBoth);
  }, [key, colour, playing]);

  return stage;
}
