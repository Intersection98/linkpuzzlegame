import { describe, expect, it } from "vitest";
import { validateCellLoop, isCellLoopLevel, solutionMarks } from "./cellLoop";
import {
  BALANCE_LOOP_LEVELS,
  GERADEWEG_LEVELS,
  MASYU_LEVELS,
  MIDLOOP_LEVELS,
  PIPELINK_LEVELS,
  SHINGOKI_LEVELS
} from "./cellLoopLevels";
import { validateBoard, type NumberlinkLevel, type PuzzleMode } from "./game";
import { validateHashi, isHashiLevel } from "./hashi";
import { HASHI_LEVELS } from "./hashiLevels";
import { NUMBERLINK_LEVELS } from "./levels";
import { isMejilinkLevel, validateMejilink } from "./mejilink";
import { MEJILINK_LEVELS } from "./mejilinkLevels";
import { NUMBER_END_LEVELS } from "./numberEndLevels";
import {
  isSlitherlinkLevel,
  validateSlitherlink,
  type EdgeMap
} from "./slitherlink";
import { SLITHERLINK_LEVELS } from "./slitherlinkLevels";
import { isThermometerLevel, validateThermometers } from "./thermometers";
import { THERMOMETER_LEVELS } from "./thermometerLevels";

const CHAPTER_LEVELS = [
  NUMBERLINK_LEVELS,
  NUMBER_END_LEVELS,
  SLITHERLINK_LEVELS,
  MEJILINK_LEVELS,
  PIPELINK_LEVELS,
  THERMOMETER_LEVELS,
  HASHI_LEVELS,
  MASYU_LEVELS,
  MIDLOOP_LEVELS,
  BALANCE_LOOP_LEVELS,
  GERADEWEG_LEVELS,
  SHINGOKI_LEVELS
] satisfies NumberlinkLevel[][];

const ALL_LEVELS: NumberlinkLevel[] = CHAPTER_LEVELS.flat();
const EXPECTED_MODES: PuzzleMode[] = [
  "numberlink",
  "number-end",
  "slitherlink",
  "mejilink",
  "pipelink",
  "thermometers",
  "hashi",
  "masyu",
  "midloop",
  "balance-loop",
  "geradeweg",
  "shingoki"
];
const EXPECTED_COUNTS = [10, 8, 10, 8, 8, 8, 8, 8, 8, 8, 8, 8];

function edgeMarks(edges: string[]): EdgeMap {
  return Object.fromEntries(edges.map((edge) => [edge, "line"])) as EdgeMap;
}

describe("100-level catalog", () => {
  it("contains every level exactly once in chapter order", () => {
    expect(ALL_LEVELS).toHaveLength(100);
    expect(ALL_LEVELS.map((level) => level.id)).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 1)
    );
    expect(new Set(ALL_LEVELS.map((level) => level.id)).size).toBe(100);
  });

  it("matches the 12 chapter modes and planned level counts", () => {
    expect(CHAPTER_LEVELS).toHaveLength(12);
    CHAPTER_LEVELS.forEach((levels, index) => {
      expect(levels).toHaveLength(EXPECTED_COUNTS[index]);
      expect(levels.every((level) => level.chapter === index + 1)).toBe(true);
      expect(levels.every((level) => level.mode === EXPECTED_MODES[index])).toBe(
        true
      );
    });
  });

  it("keeps only the two finales above the 7x7 limit", () => {
    expect(
      ALL_LEVELS.every(
        (level) =>
          level.rows > 0 &&
          level.cols > 0 &&
          (([68, 100].includes(level.id) &&
            level.rows === 8 &&
            level.cols === 8) ||
            (level.rows <= 7 && level.cols <= 7))
      )
    ).toBe(true);
  });

  it.each(ALL_LEVELS)("level $id accepts its canonical solution", (level) => {
    if (isSlitherlinkLevel(level)) {
      expect(validateSlitherlink(level, edgeMarks(level.solutionEdges))).toEqual({
        complete: true
      });
      return;
    }
    if (isMejilinkLevel(level)) {
      expect(validateMejilink(level, edgeMarks(level.solutionEdges))).toEqual({
        complete: true
      });
      return;
    }
    if (isCellLoopLevel(level)) {
      expect(validateCellLoop(level, solutionMarks(level))).toEqual({
        complete: true
      });
      return;
    }
    if (isThermometerLevel(level)) {
      expect(validateThermometers(level, level.solutionFill)).toEqual({
        complete: true
      });
      return;
    }
    if (isHashiLevel(level)) {
      expect(validateHashi(level, level.solutionBridges)).toEqual({
        complete: true
      });
      return;
    }
    expect(validateBoard(level, level.solution)).toEqual({ complete: true });
  });
});
