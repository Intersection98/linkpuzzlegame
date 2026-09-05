import { describe, expect, it } from "vitest";
import { solveHashi } from "../scripts/search-hashi";
import {
  bridgeKey,
  bridgesCross,
  getHashiBridges,
  getHashiHint,
  validateHashi
} from "./hashi";
import { HASHI_LEVELS } from "./hashiLevels";

describe("Hashi", () => {
  it("contains eight progressively larger levels within the board limit", () => {
    expect(HASHI_LEVELS.map((level) => level.id)).toEqual([
      53, 54, 55, 56, 57, 58, 59, 60
    ]);
    expect(HASHI_LEVELS.map((level) => level.rows)).toEqual([
      5, 5, 6, 6, 7, 7, 7, 7
    ]);
    expect(HASHI_LEVELS.map((level) => level.islands.length)).toEqual([
      7, 9, 11, 13, 15, 22, 23, 24
    ]);
  });

  it.each(HASHI_LEVELS)(
    "level $id spans its board and has a valid unique solution",
    (level) => {
      const rows = level.islands.map((island) => island.row);
      const cols = level.islands.map((island) => island.col);
      expect(Math.min(...rows)).toBe(0);
      expect(Math.max(...rows)).toBe(level.rows - 1);
      expect(Math.min(...cols)).toBe(0);
      expect(Math.max(...cols)).toBe(level.cols - 1);
      expect(getHashiBridges(level).length).toBeGreaterThan(
        level.islands.length
      );
      expect(validateHashi(level, level.solutionBridges)).toEqual({
        complete: true
      });

      const result = solveHashi(level);
      expect(result.aborted).toBe(false);
      expect(result.count).toBe(1);
    }
  );

  it("introduces crossing choices and denser networks in later levels", () => {
    const metrics = HASHI_LEVELS.map((level) => {
      const candidates = getHashiBridges(level);
      const crossings = candidates.reduce(
        (sum, bridge, index) =>
          sum +
          candidates
            .slice(index + 1)
            .filter((candidate) => bridgesCross(bridge, candidate)).length,
        0
      );
      return { candidates: candidates.length, crossings };
    });

    expect(metrics[3].crossings).toBeGreaterThan(0);
    expect(metrics[5].crossings).toBeGreaterThanOrEqual(6);
    expect(metrics[6].crossings).toBeGreaterThanOrEqual(6);
    expect(metrics[7].crossings).toBeGreaterThanOrEqual(7);
    expect(metrics[7].candidates).toBeGreaterThan(metrics[0].candidates * 4);
  });

  it("makes the final three levels substantially harder to search", () => {
    const finalNodes = HASHI_LEVELS.slice(-3).map(
      (level) => solveHashi(level).nodes
    );
    expect(finalNodes[0]).toBeGreaterThanOrEqual(60);
    expect(finalNodes[1]).toBeGreaterThan(finalNodes[0]);
    expect(finalNodes[2]).toBeGreaterThanOrEqual(100);
    expect(finalNodes[2]).toBeGreaterThan(finalNodes[1]);
  });

  it("removes a wrong crossing bridge before adding a correct bridge", () => {
    const level = HASHI_LEVELS.find(({ id }) => id === 56)!;
    const wrongCrossing = bridgeKey("H", "L");

    expect(level.solutionBridges[wrongCrossing]).toBeUndefined();
    expect(getHashiHint(level, { [wrongCrossing]: 1 })).toEqual({
      key: wrongCrossing,
      count: 0
    });
  });

  it("reduces an extra bridge before filling missing bridges", () => {
    const level = HASHI_LEVELS.find(({ id }) => id === 60)!;
    const singleBridge = Object.entries(level.solutionBridges).find(
      ([, count]) => count === 1
    )![0];

    expect(getHashiHint(level, { [singleBridge]: 2 })).toEqual({
      key: singleBridge,
      count: 1
    });
  });
});
