import { describe, expect, it } from "vitest";
import {
  clonePaths,
  isAdjacent,
  pathConnectsEndpoints,
  pathIsComplete,
  validateBoard
} from "./game";
import { NUMBERLINK_LEVELS } from "./levels";
import { NUMBER_END_LEVELS } from "./numberEndLevels";

describe("Numberlink levels", () => {
  it("contains ten sequential levels", () => {
    expect(NUMBERLINK_LEVELS).toHaveLength(10);
    expect(NUMBERLINK_LEVELS.map((level) => level.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10
    ]);
  });

  it.each(NUMBERLINK_LEVELS)(
    "level $id has a valid full-board canonical solution",
    (level) => {
      expect(validateBoard(level, level.solution)).toEqual({ complete: true });

      const occupiedCells = Object.values(level.solution).flat();
      expect(occupiedCells).toHaveLength(level.rows * level.cols);

      Object.entries(level.solution).forEach(([color, path]) => {
        expect(pathConnectsEndpoints(level, color, path)).toBe(true);
        path.slice(1).forEach((point, index) => {
          expect(isAdjacent(path[index], point)).toBe(true);
        });
      });
    }
  );

  it("accepts paths drawn from either endpoint", () => {
    const level = NUMBERLINK_LEVELS[0];
    const reversed = Object.fromEntries(
      Object.entries(level.solution).map(([color, path]) => [
        color,
        [...path].reverse()
      ])
    );

    expect(validateBoard(level, reversed)).toEqual({ complete: true });
  });

  it("keeps the final four levels compact while escalating difficulty", () => {
    const finalLevels = NUMBERLINK_LEVELS.slice(6);

    expect(finalLevels.map(({ rows, cols }) => [rows, cols])).toEqual([
      [6, 6],
      [7, 7],
      [7, 7],
      [7, 7]
    ]);
    expect(finalLevels.map((level) => level.difficulty)).toEqual([
      "困难",
      "困难",
      "专家",
      "极限"
    ]);
    expect(finalLevels.map((level) => level.colors.length)).toEqual([4, 5, 5, 5]);
  });

  it("rejects an incomplete board", () => {
    const level = NUMBERLINK_LEVELS[0];
    const paths = clonePaths(level.solution);
    paths[level.colors[0].id] = paths[level.colors[0].id].slice(0, -1);

    expect(validateBoard(level, paths).complete).toBe(false);
  });

  it("rejects overlapping paths", () => {
    const level = NUMBERLINK_LEVELS[0];
    const paths = clonePaths(level.solution);
    paths[level.colors[1].id][1] = paths[level.colors[0].id][1];

    expect(validateBoard(level, paths)).toEqual({
      complete: false,
      reason: "overlap"
    });
  });
});

describe("NumberEnd levels", () => {
  it("contains eight sequential levels", () => {
    expect(NUMBER_END_LEVELS.map((level) => level.id)).toEqual([
      11, 12, 13, 14, 15, 16, 17, 18
    ]);
  });

  it.each(NUMBER_END_LEVELS)(
    "level $id has exact, distinct target lengths and a valid full-board solution",
    (level) => {
      expect(level.mode).toBe("number-end");
      expect(validateBoard(level, level.solution)).toEqual({ complete: true });

      const targets = level.colors.map(
        (color) => level.targetLengths?.[color.id]
      );
      expect(new Set(targets).size).toBe(targets.length);
      expect(targets.reduce<number>((sum, value) => sum + (value ?? 0), 0)).toBe(
        level.rows * level.cols
      );

      level.colors.forEach((color) => {
        expect(
          pathIsComplete(level, color.id, level.solution[color.id])
        ).toBe(true);
      });
    }
  );

  it("rejects a connected NumberEnd path with the wrong length", () => {
    const level = NUMBER_END_LEVELS[0];
    const paths = clonePaths(level.solution);
    const color = level.colors[0].id;
    paths[color] = [...level.endpoints[color]];

    expect(validateBoard(level, paths)).toEqual({
      complete: false,
      reason: "wrong-length"
    });
  });
});
