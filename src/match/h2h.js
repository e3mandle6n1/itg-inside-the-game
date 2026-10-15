export const H2H = {
  meetings: { home: 1, draw: 0, away: 0 },
  averageGoals: {
    scored: { home: 2, away: 1 },
    conceded: { home: 0, away: 3 },
  },
  topScorers: {
    home: { name: "Kessler, Jonas", goals: 1, role: "Midfielder", country: "no" },
    away: { name: "Sato, Ren", goals: 1, role: "Forward", country: "jp" },
  },
  form: {
    home: [
      { result: "W", venue: "h", opp: "RV", score: "3:0" },
      { result: "W", venue: "h", opp: "HAL", score: "2:1" },
      { result: "L", venue: "a", opp: "CLI", score: "0:1" },
      { result: "W", venue: "h", opp: "ORW", score: "2:0" },
      { result: "W", venue: "h", opp: "TYN", score: "3:1" },
    ],
    away: [
      { result: "L", venue: "a", opp: "NB", score: "0:3" },
      { result: "W", venue: "h", opp: "SEN", score: "1:0" },
      { result: "L", venue: "a", opp: "AZU", score: "1:2" },
      { result: "W", venue: "h", opp: "VAL", score: "2:1" },
      { result: "L", venue: "a", opp: "SAL", score: "0:2" },
    ],
  },
};

export function formWinPct(rows) {
  const list = (rows || []).slice(0, 5);
  if (!list.length) return 0;
  const wins = list.filter((row) => (row.result || row) === "W").length;
  return Math.round((wins / list.length) * 100);
}
