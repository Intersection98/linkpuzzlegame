import type { NumberlinkLevel, Point } from "./game";

export type Thermometer = {
  id: string;
  cells: Point[];
};

export type ThermometerState = Record<string, number>;

export type ThermometerLevel = Omit<
  NumberlinkLevel,
  "mode" | "chapter"
> & {
  mode: "thermometers";
  chapter: 6;
  thermometers: Thermometer[];
  rowTargets: number[];
  colTargets: number[];
  solutionFill: ThermometerState;
};

export function isThermometerLevel(
  level: NumberlinkLevel
): level is ThermometerLevel {
  return level.mode === "thermometers" && "thermometers" in level;
}

export function filledCells(
  level: ThermometerLevel,
  state: ThermometerState
): Set<string> {
  const filled = new Set<string>();
  level.thermometers.forEach((thermometer) => {
    const count = Math.max(
      0,
      Math.min(thermometer.cells.length, state[thermometer.id] ?? 0)
    );
    thermometer.cells.slice(0, count).forEach((cell) => {
      filled.add(`${cell.row}:${cell.col}`);
    });
  });
  return filled;
}

export function thermometerCounts(
  level: ThermometerLevel,
  state: ThermometerState
): { rows: number[]; cols: number[]; total: number } {
  const rows = Array.from({ length: level.rows }, () => 0);
  const cols = Array.from({ length: level.cols }, () => 0);
  filledCells(level, state).forEach((key) => {
    const [row, col] = key.split(":").map(Number);
    rows[row] += 1;
    cols[col] += 1;
  });
  return { rows, cols, total: rows.reduce((sum, count) => sum + count, 0) };
}

export function validateThermometers(
  level: ThermometerLevel,
  state: ThermometerState
): { complete: boolean; reason?: string } {
  const counts = thermometerCounts(level, state);
  if (counts.rows.some((count, row) => count !== level.rowTargets[row])) {
    return { complete: false, reason: "row-mismatch" };
  }
  if (counts.cols.some((count, col) => count !== level.colTargets[col])) {
    return { complete: false, reason: "column-mismatch" };
  }
  return { complete: true };
}

export function getCountState(
  actual: number,
  target: number
): "pending" | "matched" | "exceeded" {
  if (actual > target) return "exceeded";
  if (actual === target) return "matched";
  return "pending";
}
