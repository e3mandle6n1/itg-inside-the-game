import { describe, expect, it } from "vitest";
import {
  firstShootoutTeam,
  isInShootout,
  isShootoutKick,
  isShootoutMissed,
  isShootoutPeriodStart,
  isShootoutScored,
  shootoutAttempts,
  shootoutTally,
} from "../../src/match/shootout.js";

const penStart = {
  type: "periodstart",
  incident: "periodstart",
  clock: "Penalties",
  text: "We go to a penalty shoot-out.",
};

const scored = (team, n) => ({
  type: "goal",
  incident: "goal",
  team,
  shootout: true,
  period: "penalties",
  minute: 90,
  added: n,
});

const missed = (team, n) => ({
  type: "shotofftarget",
  incident: "shotofftarget",
  team,
  shootout: true,
  period: "penalties",
  minute: 90,
  added: n,
});

describe("isShootoutPeriodStart / kick", () => {
  it("detects period start", () => {
    expect(isShootoutPeriodStart(penStart)).toBe(true);
    expect(isShootoutPeriodStart({ type: "periodstart", clock: "1st half" })).toBe(false);
  });

  it("detects scored and missed kicks", () => {
    expect(isShootoutKick(scored("home", 1))).toBe(true);
    expect(isShootoutScored(scored("home", 1))).toBe(true);
    expect(isShootoutMissed(missed("away", 2))).toBe(true);
    expect(isShootoutKick({ type: "goal", team: "home" })).toBe(false);
  });
});

describe("shootoutAttempts / tally", () => {
  const track = [
    penStart,
    scored("home", 1),
    missed("away", 2),
    scored("home", 3),
    scored("away", 4),
  ];

  it("lists results in order per side", () => {
    expect(shootoutAttempts(track, 4)).toEqual({
      home: ["scored", "scored"],
      away: ["missed", "scored"],
    });
  });

  it("pads to five slots by default", () => {
    expect(shootoutTally(track, 2)).toEqual({
      home: ["scored", null, null, null, null],
      away: ["missed", null, null, null, null],
      slots: 5,
      suddenDeath: false,
      round: null,
    });
  });

  it("sudden death shows one dot each for the current round", () => {
    const fiveEach = [
      ...track,
      scored("home", 5),
      scored("away", 6),
      scored("home", 7),
      scored("away", 8),
      scored("home", 9),
      missed("away", 10),
    ];
    expect(shootoutTally(fiveEach, fiveEach.length - 1).slots).toBe(5);
    expect(shootoutTally(fiveEach, fiveEach.length - 1).suddenDeath).toBe(false);

    const afterHomeSixth = [...fiveEach, scored("home", 11)];
    expect(shootoutTally(afterHomeSixth, afterHomeSixth.length - 1)).toEqual({
      home: ["scored"],
      away: [null],
      slots: 1,
      suddenDeath: true,
      round: 6,
    });

    const afterAwaySixth = [...afterHomeSixth, missed("away", 12)];
    expect(shootoutTally(afterAwaySixth, afterAwaySixth.length - 1)).toEqual({
      home: ["scored"],
      away: ["missed"],
      slots: 1,
      suddenDeath: true,
      round: 6,
    });

    const roundSeven = [...afterAwaySixth, scored("home", 13)];
    expect(shootoutTally(roundSeven, roundSeven.length - 1)).toEqual({
      home: ["scored"],
      away: [null],
      slots: 1,
      suddenDeath: true,
      round: 7,
    });
  });
});

describe("isInShootout / first team", () => {
  it("active after pen start until match end", () => {
    const track = [penStart, scored("away", 1), { type: "match_ended", incident: "match_ended" }];
    expect(isInShootout(track, 0)).toBe(true);
    expect(isInShootout(track, 1)).toBe(true);
    expect(isInShootout(track, 2)).toBe(true);
    expect(firstShootoutTeam(track)).toBe("away");
  });
});
