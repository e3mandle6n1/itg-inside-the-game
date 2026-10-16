import { describe, expect, it } from "vitest";
import { statsAt } from "../../src/match/stats.js";

describe("statsAt", () => {
  const track = [
    { incident: "goal", team: "home", minute: 10 },
    { incident: "shotofftarget", team: "away", minute: 12 },
    { incident: "card", team: "away", card: "yellow", minute: 20 },
    { incident: "goalkeeper_saved", team: "home", minute: 30 },
    { incident: "freekick", team: "home", minute: 33 },
    { phase: "dangerous", team: "home", type: "match_action", minute: 40 },
    { phase: "dangerous", team: "home", type: "match_action", minute: 41 },
    { phase: "attack", team: "away", type: "match_action", minute: 42 },
  ];

  const template = [
    [
      { label: "Shots on target" },
      { label: "Shots off target" },
      { label: "Cards" },
      { label: "Saves" },
      { label: "Free kicks" },
      { label: "Fouls" },
      { label: "Dangerous attacks" },
      { label: "Ball possession" },
    ],
  ];

  it("tallies + template", () => {
    const { pages, yellow, red } = statsAt(track, track.length - 1, template);
    const byLabel = Object.fromEntries(pages[0].map((row) => [row.label, row]));

    expect(byLabel["Shots on target"]).toEqual({ label: "Shots on target", home: 1, away: 1 });
    expect(byLabel["Shots off target"]).toEqual({ label: "Shots off target", home: 0, away: 1 });
    expect(byLabel.Cards).toEqual({ label: "Cards", home: 0, away: 1 });
    expect(byLabel.Saves).toEqual({ label: "Saves", home: 1, away: 0 });
    expect(byLabel["Free kicks"]).toEqual({ label: "Free kicks", home: 1, away: 0 });
    expect(byLabel.Fouls).toEqual({ label: "Fouls", home: 0, away: 1 });
    expect(byLabel["Dangerous attacks"]).toEqual({
      label: "Dangerous attacks",
      home: 1,
      away: 0,
    });
    expect(byLabel["Ball possession"].home).toMatch(/%$/);
    expect(yellow).toEqual({ home: 0, away: 1 });
    expect(red).toEqual({ home: 0, away: 0 });
  });

  it("stops at index", () => {
    const { pages } = statsAt(track, 0, [[{ label: "Shots on target" }]]);
    expect(pages[0][0]).toEqual({ label: "Shots on target", home: 1, away: 0 });
  });
});
