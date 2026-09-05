import { describe, expect, it } from "vitest";
import { solveThermometers } from "../scripts/search-thermometers";
import { THERMOMETER_LEVELS } from "./thermometerLevels";
import {
  filledCells,
  thermometerCounts,
  validateThermometers
} from "./thermometers";

describe("Thermometers", () => {
  it("contains levels 45 through 52 within the board limit", () => {
    expect(THERMOMETER_LEVELS.map((level) => level.id)).toEqual([
      45, 46, 47, 48, 49, 50, 51, 52
    ]);
    expect(
      THERMOMETER_LEVELS.every(
        (level) => level.rows <= 7 && level.cols <= 7
      )
    ).toBe(true);
    expect(THERMOMETER_LEVELS.map((level) => level.rows)).toEqual([
      4, 5, 6, 6, 6, 7, 7, 7
    ]);
  });

  it.each(THERMOMETER_LEVELS)(
    "level $id accepts its canonical fill",
    (level) => {
      expect(validateThermometers(level, level.solutionFill)).toEqual({
        complete: true
      });
      const counts = thermometerCounts(level, level.solutionFill);
      expect(counts.rows).toEqual(level.rowTargets);
      expect(counts.cols).toEqual(level.colTargets);
    }
  );

  it.each(THERMOMETER_LEVELS)(
    "level $id has one solution and a varied path tiling",
    (level) => {
      const cells = level.thermometers.flatMap(
        (thermometer) => thermometer.cells
      );
      expect(cells).toHaveLength(level.rows * level.cols);
      expect(
        new Set(cells.map((cell) => `${cell.row}:${cell.col}`)).size
      ).toBe(cells.length);
      level.thermometers.forEach((thermometer) => {
        thermometer.cells.slice(1).forEach((cell, index) => {
          const previous = thermometer.cells[index];
          expect(
            Math.abs(cell.row - previous.row) +
              Math.abs(cell.col - previous.col)
          ).toBe(1);
        });
      });
      const bentCount = level.thermometers.filter((thermometer) => {
        const directions = thermometer.cells.slice(1).map((cell, index) => {
          const previous = thermometer.cells[index];
          return `${cell.row - previous.row}:${cell.col - previous.col}`;
        });
        return new Set(directions).size > 1;
      }).length;
      if (level.id <= 48) expect(bentCount).toBe(0);
      else expect(bentCount).toBeGreaterThanOrEqual(2);

      const result = solveThermometers(level);
      expect(result.aborted).toBe(false);
      expect(result.count).toBe(1);
    }
  );

  it("always fills each thermometer as a prefix from its bulb", () => {
    const level = THERMOMETER_LEVELS[0];
    const thermometer = level.thermometers[0];
    const filled = filledCells(level, { [thermometer.id]: 2 });

    expect(filled.has(`${thermometer.cells[0].row}:${thermometer.cells[0].col}`)).toBe(true);
    expect(filled.has(`${thermometer.cells[1].row}:${thermometer.cells[1].col}`)).toBe(true);
    expect(filled.size).toBe(2);
  });
});
