import { describe, expect, it } from "vitest";
import {
  attackDepth,
  cardColour,
  clampPitch,
  clockKey,
  clockLabel,
  eventKind,
  family,
  tipSide,
} from "../../src/match/util.js";

describe("clampPitch", () => {
  it("non-finite -> 50", () => {
    expect(clampPitch(undefined)).toBe(50);
    expect(clampPitch(NaN)).toBe(50);
    expect(clampPitch("x")).toBe(50);
  });

  it("edge clamp", () => {
    expect(clampPitch(0)).toBe(6);
    expect(clampPitch(2)).toBe(6);
    expect(clampPitch(98)).toBe(94);
    expect(clampPitch(100)).toBe(94);
  });

  it("mid values pass", () => {
    expect(clampPitch(50)).toBe(50);
    expect(clampPitch(25)).toBe(25);
  });
});

describe("family", () => {
  it("first surname segment", () => {
    expect(family("Kessler, Jonas")).toBe("Kessler");
    expect(family("Okoro")).toBe("Okoro");
    expect(family("")).toBe("");
  });
});

describe("clockLabel", () => {
  it("empty without clock/minute", () => {
    expect(clockLabel(null)).toBe("");
    expect(clockLabel({})).toBe("");
  });

  it("prefers clock string", () => {
    expect(clockLabel({ clock: "45'+2", minute: 45, added: 2 })).toBe("45'+2");
  });

  it("minute + stoppage", () => {
    expect(clockLabel({ minute: 12 })).toBe("12'");
    expect(clockLabel({ minute: 45, added: 3 })).toBe("45'+3");
  });
});

describe("cardColour", () => {
  it("default yellow", () => {
    expect(cardColour({})).toBe("yellow");
    expect(cardColour({ card: "YELLOW" })).toBe("yellow");
  });

  it("red / second yellow", () => {
    expect(cardColour({ card: "red" })).toBe("red");
    expect(cardColour({ card: "yellow_red" })).toBe("yellowred");
    expect(cardColour({ card: "second yellow" })).toBe("yellowred");
  });
});

describe("tipSide", () => {
  it("opposite side of ball", () => {
    expect(tipSide({ x: 70, y: 50 }, "home")).toBe("left");
    expect(tipSide({ x: 20, y: 50 }, "home")).toBe("right");
  });

  it("mid third uses team", () => {
    expect(tipSide({ x: 50, y: 50 }, "home")).toBe("left");
    expect(tipSide({ x: 50, y: 50 }, "away")).toBe("right");
  });
});

describe("eventKind / clockKey", () => {
  it("incident over type", () => {
    expect(eventKind({ incident: "goal", type: "card" })).toBe("goal");
    expect(eventKind({ type: "corner" })).toBe("corner");
  });

  it("minute then stoppage", () => {
    expect(clockKey({ minute: 45, added: 2 })).toBe(45.02);
    expect(clockKey({})).toBe(0);
  });
});

describe("attackDepth", () => {
  it("null without team/x", () => {
    expect(attackDepth({ x: 60 })).toBeNull();
    expect(attackDepth({ team: "home" })).toBeNull();
    expect(attackDepth({ team: "home", x: "nope" })).toBeNull();
  });

  it("away depth mirrored", () => {
    expect(attackDepth({ team: "home", x: 70 })).toBe(70);
    expect(attackDepth({ team: "away", x: 70 })).toBe(30);
  });
});
