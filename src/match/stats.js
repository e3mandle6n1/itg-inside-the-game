import { cardColour } from "./util.js";

const BY_TYPE = {
  card: "Cards",
  shotofftarget: "Shots off target",
  shotblocked: "Shots blocked",
  corner: "Corner kicks",
  freekick: "Free kicks",
  offside: "Offsides",
  goal_kick: "Goal kicks",
  throwin: "Throw-ins",
  substitution: "Substitutions",
  injury: "Injuries",
};

function tallies() {
  return {
    Cards: 0,
    yellow: 0,
    red: 0,
    "Shots on target": 0,
    "Shots off target": 0,
    "Shots blocked": 0,
    "Corner kicks": 0,
    "Free kicks": 0,
    Offsides: 0,
    "Goal kicks": 0,
    Saves: 0,
    "Throw-ins": 0,
    Substitutions: 0,
    Injuries: 0,
    Fouls: 0,
    "Dangerous attacks": 0,
    possession: 0,
    dangerousTime: 0,
  };
}

export function statsAt(playTrack, index, template) {
  const home = tallies();
  const away = tallies();
  const bag = (team) => (team === "home" ? home : team === "away" ? away : null);

  let lastDanger = null;
  const end = Math.max(0, Math.min(index, playTrack.length - 1));

  for (let i = 0; i <= end; i += 1) {
    const row = playTrack[i];
    const kind = row.incident || (row.phase != null ? null : row.type);
    const side = bag(row.team);

    if (
      side
      && row.phase
      && kind !== "periodstart"
      && kind !== "periodscore"
      && kind !== "match_ended"
      && kind !== "kickoff"
    ) {
      side.possession += 1;
      if (row.phase === "dangerous") {
        side.dangerousTime += 1;
        const key = `${row.team}:dangerous`;
        if (key !== lastDanger) {
          side["Dangerous attacks"] += 1;
          lastDanger = key;
        }
      } else {
        lastDanger = row.team ? `${row.team}:${row.phase}` : null;
      }
    }

    if (!kind || !side) continue;

    if (kind === "card") {
      side.Cards += 1;
      const colour = cardColour(row);
      if (colour === "red" || colour === "yellowred") side.red += 1;
      else side.yellow += 1;
      continue;
    }

    if (kind === "goal" || kind === "shotontarget") {
      side["Shots on target"] += 1;
      continue;
    }

    if (kind === "goalkeeper_saved") {
      side.Saves += 1;
      const shooter = bag(row.team === "home" ? "away" : "home");
      if (shooter) shooter["Shots on target"] += 1;
      continue;
    }

    if (kind === "freekick_taken") continue;

    const label = BY_TYPE[kind];
    if (label) side[label] += 1;
  }

  home.Fouls = away["Free kicks"];
  away.Fouls = home["Free kicks"];

  const pages = (template || []).map((page) =>
    page.map((row) => paint(row, home, away)),
  );

  return {
    pages: pages.length ? pages : [[]],
    yellow: { home: home.yellow, away: away.yellow },
    red: { home: home.red, away: away.red },
  };
}

function paint(row, home, away) {
  const { label } = row;
  if (label === "Ball possession") return pct(label, home.possession, away.possession);
  if (label === "Time in dangerous attack") return pct(label, home.dangerousTime, away.dangerousTime);
  return {
    label,
    home: home[label] ?? 0,
    away: away[label] ?? 0,
  };
}

function pct(label, home, away) {
  const total = home + away;
  if (!total) return { label, home: "0%", away: "0%" };
  const h = Math.round((home / total) * 100);
  return { label, home: `${h}%`, away: `${100 - h}%` };
}
