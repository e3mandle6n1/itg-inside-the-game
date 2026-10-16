import Caption from "../components/Caption.jsx";
import MatchTabs from "../components/MatchTabs.jsx";
import Momentum from "../components/Momentum.jsx";
import PitchStage from "../components/pitch/PitchStage.jsx";
import Scoreboard from "../components/Scoreboard.jsx";

export default function LiveTracker({ match, playback }) {
  const {
    event,
    score,
    minute,
    ball,
    ended,
    timeline,
    eventIndex,
    seekEvent,
    playTrack,
    index,
    playing,
  } = playback;

  return (
    <section className="widget">
      <Scoreboard match={match} score={score} event={event} minute={minute} ended={ended} />
      <Momentum match={match} minute={minute} />
      <PitchStage
        match={match}
        event={event}
        ball={ball}
        ended={ended}
        score={score}
        playing={playing}
        playTrack={playTrack}
        playIndex={index}
      />
      <Caption event={event} match={match} />
      <MatchTabs
        match={match}
        timeline={timeline}
        index={eventIndex}
        onSeek={seekEvent}
        playTrack={playTrack}
        playIndex={index}
      />
    </section>
  );
}
