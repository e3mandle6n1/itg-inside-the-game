import { momentumIcon } from "../match";

const PRIORITY = { goal: 3, card: 2, substitution: 1 };

function clusterMarks(marks) {
  const sorted = [...marks].sort((a, b) => a.minute - b.minute);
  const clusters = [];

  for (const mark of sorted) {
    const last = clusters[clusters.length - 1];
    if (last && mark.minute - last.anchor <= 1.5) {
      last.items.push(mark);
    } else {
      clusters.push({ anchor: mark.minute, items: [mark] });
    }
  }

  return clusters.map((cluster, index) => {
    const lead = [...cluster.items].sort(
      (a, b) => (PRIORITY[b.type] || 0) - (PRIORITY[a.type] || 0),
    )[0];
    const left = (cluster.anchor / 94) * 100;
    return {
      key: `${cluster.anchor}-${index}`,
      left: Math.min(left, 97),
      icon: momentumIcon(lead),
      extra: cluster.items.length - 1,
      title: cluster.items.map((m) => `${m.type} ${m.minute}'`).join(", "),
    };
  });
}

function layoutClusters(clusters) {
  const minGap = 4.5;
  let cursor = -Infinity;
  return clusters.map((cluster) => {
    let left = cluster.left;
    if (left - cursor < minGap) left = cursor + minGap;
    cursor = left;
    return { ...cluster, left: Math.min(left, 97.5) };
  });
}

function Lane({ team, short, marks, minute }) {
  const visible = marks.filter((mark) => mark.team === team && mark.minute <= minute);
  const laid = layoutClusters(clusterMarks(visible));

  return (
    <div className="lane">
      <span className="lane-label">{short}</span>
      <div className="lane-track">
        <div className="line" />
        <div className="glyphs">
          {laid.map((mark) => (
            <span
              key={mark.key}
              className="glyph-wrap"
              style={{ left: `${mark.left}%` }}
              title={mark.title}
            >
              <img
                className={`glyph glyph-${mark.icon}`}
                src={`/icons/${mark.icon}.svg`}
                alt=""
              />
              {mark.extra > 0 && <em className="glyph-plus">+{mark.extra}</em>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Momentum({ match, minute }) {
  return (
    <div className="momentum">
      <div className="scale">
        {match.marks.map((mark) => <span key={mark}>{mark}</span>)}
      </div>
      <Lane team="home" short={match.home.short} marks={match.momentum} minute={minute} />
      <Lane team="away" short={match.away.short} marks={match.momentum} minute={minute} />
      <small>2x45 min</small>
    </div>
  );
}
