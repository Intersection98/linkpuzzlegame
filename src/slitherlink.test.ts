import { describe, expect, it } from "vitest";
import { SLITHERLINK_LEVELS } from "./slitherlinkLevels";
import {
  findSlitherlinkConflict,
  getCellEdges,
  getSlitherlinkEdges,
  getSlitherlinkClueState,
  slitherlinkProgress,
  validateSlitherlink,
  type EdgeMap
} from "./slitherlink";

function solvedMarks(levelIndex: number): EdgeMap {
  return Object.fromEntries(
    SLITHERLINK_LEVELS[levelIndex].solutionEdges.map((edge) => [edge, "line"])
  );
}

describe("Slitherlink levels", () => {
  it("contains ten sequential levels with the planned board sizes", () => {
    expect(SLITHERLINK_LEVELS.map((level) => level.id)).toEqual([
      19, 20, 21, 22, 23, 24, 25, 26, 27, 28
    ]);
    expect(SLITHERLINK_LEVELS.map((level) => level.rows)).toEqual([
      4, 4, 5, 5, 5, 6, 6, 6, 6, 7
    ]);
  });

  it.each(SLITHERLINK_LEVELS)(
    "level $id has a valid canonical single loop",
    (level) => {
      expect(validateSlitherlink(level, solvedMarks(level.id - 19))).toEqual({
        complete: true
      });
    }
  );

  it("allows a clue to be exceeded so the UI can show it in red", () => {
    const level = SLITHERLINK_LEVELS[0];
    const zeroCell = level.clues
      .flatMap((row, rowIndex) =>
        row.map((clue, colIndex) => ({ clue, row: rowIndex, col: colIndex }))
      )
      .find((cell) => cell.clue === 0)!;
    const edge = getCellEdges(zeroCell.row, zeroCell.col)[0];

    expect(findSlitherlinkConflict(level, { [edge]: "line" })).toBeNull();
    expect(getSlitherlinkClueState(0, 1)).toBe("exceeded");
  });

  it("reports matching, pending and exceeded clue states", () => {
    expect(getSlitherlinkClueState(2, 2)).toBe("matched");
    expect(getSlitherlinkClueState(2, 1)).toBe("pending");
    expect(getSlitherlinkClueState(2, 3)).toBe("exceeded");
  });

  it("counts every currently matching clue", () => {
    const progress = slitherlinkProgress(SLITHERLINK_LEVELS[0], {});
    const zeroClues = SLITHERLINK_LEVELS[0].clues
      .flat()
      .filter((clue) => clue === 0).length;

    expect(progress.satisfiedClues).toBe(zeroClues);
    expect(progress.clueCount).toBeGreaterThan(0);
  });

  it("rejects a branch at a grid point", () => {
    const level = {
      ...SLITHERLINK_LEVELS[0],
      clues: Array.from({ length: 4 }, () => Array(4).fill(null))
    };
    const touching = getSlitherlinkEdges(level.rows, level.cols)
      .filter((edge) =>
        edge.vertices.some(([row, col]) => row === 1 && col === 1)
      )
      .slice(0, 3);
    const marks = Object.fromEntries(
      touching.map((edge) => [edge.key, "line"])
    ) as EdgeMap;

    expect(findSlitherlinkConflict(level, marks)).toBe("线条不能分叉");
  });

  it("allows a temporary closed loop while the puzzle is incomplete", () => {
    const level = SLITHERLINK_LEVELS[0];
    const marks = Object.fromEntries(
      getCellEdges(1, 2).map((edge) => [edge, "line"])
    ) as EdgeMap;

    expect(findSlitherlinkConflict(level, marks)).toBeNull();
    expect(validateSlitherlink(level, marks).complete).toBe(false);
  });
});
