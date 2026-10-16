import { describe, expect, it } from "vitest";
import { nextTabClick } from "../../src/components/MatchTabs.jsx";

describe("nextTabClick", () => {
  it("collapses when the open tab is clicked again", () => {
    expect(nextTabClick("timeline", true, "timeline")).toEqual({
      tab: "timeline",
      sheetOpen: false,
    });
  });

  it("opens a different tab", () => {
    expect(nextTabClick("timeline", true, "statistics")).toEqual({
      tab: "statistics",
      sheetOpen: true,
    });
  });

  it("reopens the same tab when the sheet is closed", () => {
    expect(nextTabClick("timeline", false, "timeline")).toEqual({
      tab: "timeline",
      sheetOpen: true,
    });
  });

  it("opens another tab from a collapsed sheet", () => {
    expect(nextTabClick("timeline", false, "lineups")).toEqual({
      tab: "lineups",
      sheetOpen: true,
    });
  });
});
