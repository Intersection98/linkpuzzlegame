import {
  thermometerCounts,
  type Thermometer,
  type ThermometerLevel,
  type ThermometerState
} from "../src/thermometers";
import type { Point } from "../src/game";

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
};

type FillOption = {
  fill: number;
  rows: number[];
  cols: number[];
};

function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function isAdjacent(first: Point, second: Point): boolean {
  return (
    Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1
  );
}

function snakePath(size: number): Point[] {
  return Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const offset = index % size;
    return {
      row,
      col: row % 2 === 0 ? offset : size - 1 - offset
    };
  });
}

function randomHamiltonianPath(
  size: number,
  random: () => number
): Point[] {
  let path = snakePath(size);
  for (let attempt = 0; attempt < size * size * 30; attempt += 1) {
    if (random() < 0.5) {
      const endpoint = path[0];
      const candidates = path
        .map((point, index) => ({ point, index }))
        .filter(
          ({ point, index }) =>
            index > 1 && isAdjacent(endpoint, point)
        );
      if (candidates.length === 0) continue;
      const { index } =
        candidates[Math.floor(random() * candidates.length)];
      path = [
        ...path.slice(0, index).reverse(),
        ...path.slice(index)
      ];
    } else {
      const endpoint = path.at(-1)!;
      const candidates = path
        .map((point, index) => ({ point, index }))
        .filter(
          ({ point, index }) =>
            index < path.length - 2 && isAdjacent(endpoint, point)
        );
      if (candidates.length === 0) continue;
      const { index } =
        candidates[Math.floor(random() * candidates.length)];
      path = [
        ...path.slice(0, index + 1),
        ...path.slice(index + 1).reverse()
      ];
    }
  }
  return path;
}

function segmentLengths(total: number, random: () => number): number[] {
  const lengths: number[] = [];
  let remaining = total;
  while (remaining > 0) {
    if (remaining <= 6 && remaining !== 1) {
      lengths.push(remaining);
      break;
    }
    const options = [2, 3, 4, 5, 6].filter(
      (length) => remaining - length !== 1
    );
    const length = options[Math.floor(random() * options.length)];
    lengths.push(length);
    remaining -= length;
  }
  return lengths;
}

function makeThermometers(
  size: number,
  random: () => number
): Thermometer[] {
  const path = randomHamiltonianPath(size, random);
  const lengths = segmentLengths(path.length, random);
  const thermometers: Thermometer[] = [];
  let cursor = 0;
  lengths.forEach((length, index) => {
    const cells = path.slice(cursor, cursor + length);
    cursor += length;
    if (random() < 0.5) cells.reverse();
    thermometers.push({ id: `t${index}`, cells });
  });
  return thermometers;
}

export function solveThermometers(
  level: ThermometerLevel,
  limit = 2,
  nodeLimit = 1_000_000
) {
  const options: FillOption[][] = level.thermometers.map((thermometer) =>
    Array.from({ length: thermometer.cells.length + 1 }, (_, fill) => {
      const rows = Array.from({ length: level.rows }, () => 0);
      const cols = Array.from({ length: level.cols }, () => 0);
      thermometer.cells.slice(0, fill).forEach((cell) => {
        rows[cell.row] += 1;
        cols[cell.col] += 1;
      });
      return { fill, rows, cols };
    })
  );

  let count = 0;
  let nodes = 0;
  let aborted = false;
  let solution: ThermometerState | null = null;

  function propagate(domains: FillOption[][]): boolean {
    let changed = true;
    while (changed) {
      changed = false;
      for (
        let constraint = 0;
        constraint < level.rows + level.cols;
        constraint += 1
      ) {
        const isRow = constraint < level.rows;
        const index = isRow ? constraint : constraint - level.rows;
        const target = isRow
          ? level.rowTargets[index]
          : level.colTargets[index];
        const values = domains.map((domain) =>
          domain.map((option) =>
            isRow ? option.rows[index] : option.cols[index]
          )
        );
        const minimums = values.map((entries) => Math.min(...entries));
        const maximums = values.map((entries) => Math.max(...entries));
        const minimum = minimums.reduce((sum, value) => sum + value, 0);
        const maximum = maximums.reduce((sum, value) => sum + value, 0);
        if (target < minimum || target > maximum) return false;

        domains.forEach((domain, thermometerIndex) => {
          if (domain.length === 1) return;
          const otherMinimum = minimum - minimums[thermometerIndex];
          const otherMaximum = maximum - maximums[thermometerIndex];
          const filtered = domain.filter((option) => {
            const value = isRow ? option.rows[index] : option.cols[index];
            return (
              value + otherMinimum <= target &&
              value + otherMaximum >= target
            );
          });
          if (filtered.length !== domain.length) {
            domains[thermometerIndex] = filtered;
            changed = true;
          }
        });
        if (domains.some((domain) => domain.length === 0)) return false;
      }
    }
    return true;
  }

  function search(domains: FillOption[][]) {
    if (count >= limit || aborted) return;
    nodes += 1;
    if (nodes > nodeLimit) {
      aborted = true;
      return;
    }
    if (!propagate(domains)) return;
    const target = domains
      .map((domain, index) => ({ domain, index }))
      .filter(({ domain }) => domain.length > 1)
      .sort((first, second) => first.domain.length - second.domain.length)[0];
    if (!target) {
      count += 1;
      solution ??= Object.fromEntries(
        domains.map((domain, index) => [
          level.thermometers[index].id,
          domain[0].fill
        ])
      );
      return;
    }
    for (const option of target.domain) {
      const next = domains.map((domain) => [...domain]);
      next[target.index] = [option];
      search(next);
      if (count >= limit || aborted) return;
    }
  }

  search(options.map((domain) => [...domain]));
  return { count, nodes, aborted, solution };
}

function makeLevel(
  size: number,
  thermometers: Thermometer[],
  solutionFill: ThermometerState
): ThermometerLevel {
  const level: ThermometerLevel = {
    id: 0,
    chapter: 6,
    chapterTitle: "温度计",
    mode: "thermometers",
    title: "generated",
    difficulty: "generated",
    rows: size,
    cols: size,
    colors: [],
    endpoints: {},
    solution: {},
    thermometers,
    rowTargets: [],
    colTargets: [],
    solutionFill
  };
  const counts = thermometerCounts(level, solutionFill);
  level.rowTargets = counts.rows;
  level.colTargets = counts.cols;
  return level;
}

if (process.env.RUN_THERMOMETER_SEARCH === "1") {
  const size = Number(process.argv[2] ?? 5);
  const attempts = Number(process.argv[3] ?? 1000);
  const random = randomSource(Number(process.argv[4] ?? 20260905));
  const results: Array<{
    nodes: number;
    thermometers: Thermometer[];
    solutionFill: ThermometerState;
    rowTargets: number[];
    colTargets: number[];
  }> = [];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const thermometers = makeThermometers(size, random);
    const solutionFill = Object.fromEntries(
      thermometers.map((thermometer) => [
        thermometer.id,
        Math.floor(random() * (thermometer.cells.length + 1))
      ])
    );
    const level = makeLevel(size, thermometers, solutionFill);
    if (
      level.rowTargets.every((target) => target === 0 || target === size) ||
      level.colTargets.every((target) => target === 0 || target === size)
    ) {
      continue;
    }
    const result = solveThermometers(level);
    if (result.aborted || result.count !== 1) continue;
    results.push({
      nodes: result.nodes,
      thermometers,
      solutionFill,
      rowTargets: level.rowTargets,
      colTargets: level.colTargets
    });
    results.sort((first, second) => second.nodes - first.nodes);
    results.length = Math.min(results.length, 12);
  }

  results.forEach((result) => console.log(JSON.stringify(result)));
}
