import { describe, expect, it } from "vitest";
import {
  cardSpot,
  hasSitover,
  holdFor,
  iconFor,
  incidentTitle,
  isCardEvent,
  isShootoutGoal,
  momentumIcon,
} from "../../src/match/events.js";

describe("hasSitover", () => {
  it("highlight + phase => sitover", () => {
    expect(hasSitover({ incident: "goal", phase: "attack" })).toBe(true);
    expect(hasSitover({ incident: "corner", phase: "dangerous" })).toBe(false);
  });

  it("sitover set without phase", () => {
    expect(hasSitover({ type: "corner" })).toBe(true);
    expect(hasSitover({ type: "throwin" })).toBe(false);
  });
});

describe("isCardEvent / cardSpot", () => {
  it("is card", () => {
    expect(isCardEvent({ incident: "card" })).toBe(true);
    expect(isCardEvent({ type: "goal" })).toBe(false);
  });

  it("coords or team default", () => {
    expect(cardSpot({ incident: "card", x: 10, y: 90 })).toEqual({ x: 10, y: 90 });
    expect(cardSpot({ incident: "card", team: "away" })).toEqual({ x: 58, y: 50 });
    expect(cardSpot({ incident: "card", team: "home" })).toEqual({ x: 42, y: 50 });
    expect(cardSpot({ incident: "goal" })).toBeNull();
  });
});

describe("isShootoutGoal", () => {
  it("needs a goal", () => {
    expect(isShootoutGoal({ incident: "card", shootout: true })).toBe(false);
  });

  it("shootout flag/period/text", () => {
    expect(isShootoutGoal({ incident: "goal", shootout: true })).toBe(true);
    expect(isShootoutGoal({ incident: "goal", period: "penalties" })).toBe(true);
    expect(isShootoutGoal({ incident: "goal", text: "Penalty shoot-out" })).toBe(true);
    expect(isShootoutGoal({ incident: "goal", text: "Open play" })).toBe(false);
  });
});

describe("incidentTitle / iconFor / momentumIcon", () => {
  it("card titles", () => {
    expect(incidentTitle({ incident: "card", card: "red" })).toBe("Red card");
    expect(incidentTitle({ incident: "card", card: "yellowred" })).toBe("Second yellow");
    expect(incidentTitle({ incident: "card" })).toBe("Yellow card");
    expect(incidentTitle({ incident: "goal" })).toBe("Goal");
  });

  it("icons", () => {
    expect(iconFor({ incident: "card", card: "red" })).toBe("red-card");
    expect(iconFor({ incident: "card" })).toBe("yellow-card");
    expect(iconFor({ incident: "goal" })).toBe("goal");
  });

  it("momentum icons", () => {
    expect(momentumIcon({ type: "goal" })).toBe("goal");
    expect(momentumIcon({ type: "card", card: "yellow" })).toBe("yellow-card");
    expect(momentumIcon({ type: "card", card: "red" })).toBe("red-card");
  });
});

describe("holdFor", () => {
  it("goal long, action short", () => {
    expect(holdFor({ incident: "goal" })).toBe(3400);
    expect(holdFor({ incident: "match_action" })).toBe(320);
    expect(holdFor({ incident: "card", withFreeKick: true })).toBe(2800);
    expect(holdFor(null)).toBe(280);
  });

  it("1st kick-off longer", () => {
    expect(holdFor({ incident: "periodstart", clock: "1st half", minute: 0 })).toBe(4200);
    expect(holdFor({ incident: "periodstart", clock: "2nd half" })).toBe(1600);
  });
});
