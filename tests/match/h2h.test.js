import { describe, expect, it } from "vitest";
import { formWinPct } from "../../src/match/h2h.js";

describe("formWinPct", () => {
  it("empty -> 0", () => {
    expect(formWinPct([])).toBe(0);
    expect(formWinPct(null)).toBe(0);
  });

  it("max five results", () => {
    expect(formWinPct(["W", "W", "L", "W", "W", "L"])).toBe(80);
    expect(formWinPct([{ result: "W" }, { result: "L" }, { result: "D" }])).toBe(33);
  });
});
