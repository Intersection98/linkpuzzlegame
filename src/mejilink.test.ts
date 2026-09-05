import { describe, expect, it } from "vitest";
import { solveMejilink } from "../scripts/search-mejilink";
import { MEJILINK_LEVELS } from "./mejilinkLevels";
import {
  getMejilinkEdges,
  getMejilinkRegionState,
  validateMejilink
} from "./mejilink";
import { getSlitherlinkEdges, type EdgeMap } from "./slitherlink";

describe("Mejilink levels", () => {
  it("contains levels 29 through 36 within the board limit", () => {
    expect(MEJILINK_LEVELS.map((level) => level.id)).toEqual([
      29, 30, 31, 32, 33, 34, 35, 36
    ]);
    expect(MEJILINK_LEVELS.map((level) => level.rows)).toEqual([
      4, 4, 5, 4, 5, 5, 6, 7
    ]);
    expect(MEJILINK_LEVELS.map((level) => level.cols)).toEqual([
      4, 4, 4, 6, 5, 5, 6, 7
    ]);
  });

  it.each(MEJILINK_LEVELS)(
    "level $id accepts its unique canonical loop",
    (level) => {
      const marks = Object.fromEntries(
        level.solutionEdges.map((edge) => [edge, "line"])
      ) as EdgeMap;
      expect(validateMejilink(level, marks)).toEqual({ complete: true });
      expect(
        level.regions.every(
          (region) => getMejilinkRegionState(region, marks).state === "matched"
        )
      ).toBe(true);
      const allowed = new Set(getMejilinkEdges(level).map((edge) => edge.key));
      expect(level.solutionEdges.every((edge) => allowed.has(edge))).toBe(true);
    }
  );

  it.each(MEJILINK_LEVELS)("level $id has exactly one solution", (level) => {
    const result = solveMejilink(
      level.rows,
      level.cols,
      level.regions.map((region) => region.cells),
      level.playableEdges
    );

    expect(result.aborted).toBe(false);
    expect(result.count).toBe(1);
  });

  it("rejects lines drawn through the inside of a region", () => {
    const level = MEJILINK_LEVELS[0];
    const allowed = new Set(getMejilinkEdges(level).map((edge) => edge.key));
    const internalEdge = getSlitherlinkEdges(level.rows, level.cols).find(
      (edge) => !allowed.has(edge.key)
    );

    expect(internalEdge).toBeDefined();
    expect(
      validateMejilink(level, { [internalEdge!.key]: "line" })
    ).toEqual({
      complete: false,
      reason: "invalid-edge"
    });
  });
});
