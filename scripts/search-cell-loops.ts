import {
  getCellLoopClueState,
  loopEdgesFromPath,
  solutionMarks,
  validateCellLoop,
  type CellEdgeKey,
  type CellLoopClue,
  type CellLoopLevel,
  type CellLoopMode
} from "../src/cellLoop";
import type { Point } from "../src/game";
import { CELL_LOOP_LEVELS } from "../src/cellLoopLevels";
import { solveCellLoop } from "./verify-cell-loops";

declare const process: { argv: string[] };

function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function makeLevel(
  mode: Extract<
    CellLoopMode,
    "masyu" | "midloop" | "balance-loop" | "geradeweg" | "shingoki"
  >,
  rows: number,
  cols: number,
  solutionEdges: CellEdgeKey[],
  clues: CellLoopClue[] = []
): CellLoopLevel {
  const chapter =
    mode === "masyu"
      ? 8
      : mode === "midloop"
        ? 9
        : mode === "balance-loop"
          ? 10
          : mode === "geradeweg"
            ? 11
            : 12;
  return {
    id: 0,
    chapter,
    chapterTitle: mode,
    mode,
    title: "generated",
    difficulty: "generated",
    rows,
    cols,
    colors: [],
    endpoints: {},
    solution: {},
    blockedCells: [],
    prefilledEdges: [],
    loopClues: clues,
    solutionEdges
  };
}

function growLoop(
  rows: number,
  cols: number,
  target: number,
  random: () => number
): Point[] {
  const startRow = 1 + Math.floor(random() * Math.max(1, rows - 3));
  const startCol = 1 + Math.floor(random() * Math.max(1, cols - 3));
  const loop = [
    { row: startRow, col: startCol },
    { row: startRow, col: startCol + 1 },
    { row: startRow + 1, col: startCol + 1 },
    { row: startRow + 1, col: startCol }
  ];
  const occupied = new Set(loop.map((point) => `${point.row}:${point.col}`));

  for (let tries = 0; loop.length < target && tries < target * 200; tries += 1) {
    const index = Math.floor(random() * loop.length);
    const first = loop[index];
    const second = loop[(index + 1) % loop.length];
    const offsets = random() < 0.5 ? [-1, 1] : [1, -1];
    for (const offset of offsets) {
      const nextFirst =
        first.row === second.row
          ? { row: first.row + offset, col: first.col }
          : { row: first.row, col: first.col + offset };
      const nextSecond =
        first.row === second.row
          ? { row: second.row + offset, col: second.col }
          : { row: second.row, col: second.col + offset };
      if (
        nextFirst.row < 0 ||
        nextFirst.row >= rows ||
        nextFirst.col < 0 ||
        nextFirst.col >= cols ||
        nextSecond.row < 0 ||
        nextSecond.row >= rows ||
        nextSecond.col < 0 ||
        nextSecond.col >= cols ||
        occupied.has(`${nextFirst.row}:${nextFirst.col}`) ||
        occupied.has(`${nextSecond.row}:${nextSecond.col}`)
      ) {
        continue;
      }
      loop.splice(index + 1, 0, nextFirst, nextSecond);
      occupied.add(`${nextFirst.row}:${nextFirst.col}`);
      occupied.add(`${nextSecond.row}:${nextSecond.col}`);
      break;
    }
  }
  return loop;
}

type BalanceClueStyle = "plain" | "numbered" | "mixed";
type GeradewegClueStyle = "all" | "straight" | "turn";

function isTurnOnSolution(
  level: CellLoopLevel,
  point: Point
): boolean {
  const solution = new Set(level.solutionEdges);
  const directions = [
    solution.has(`cv:${point.row - 1}:${point.col}`),
    solution.has(`ch:${point.row}:${point.col}`),
    solution.has(`cv:${point.row}:${point.col}`),
    solution.has(`ch:${point.row}:${point.col - 1}`)
  ];
  const selected = directions.flatMap((included, direction) =>
    included ? [direction] : []
  );
  return (
    selected.length === 2 &&
    (selected[0] + 2) % 4 !== selected[1]
  );
}

function clueCandidates(
  level: CellLoopLevel,
  balanceClueStyle: BalanceClueStyle,
  geradewegClueStyle: GeradewegClueStyle,
  random: () => number
): CellLoopClue[] {
  const solved = solutionMarks(level);
  if (level.mode === "masyu") {
    return Array.from({ length: level.rows * level.cols }, (_, index) => ({
      row: Math.floor(index / level.cols),
      col: index % level.cols
    })).flatMap((point) =>
      (["white", "black"] as const)
        .map((kind) => ({ ...point, kind }))
        .filter(
          (clue) => getCellLoopClueState(level, clue, solved) === "matched"
        )
    );
  }
  if (level.mode === "midloop") {
    const cells = Array.from(
      { length: level.rows * level.cols },
      (_, index) => ({
        row: Math.floor(index / level.cols),
        col: index % level.cols,
        kind: "mid-cell" as const
      })
    ).filter(
      (clue) => getCellLoopClueState(level, clue, solved) === "matched"
    );
    const edges = level.solutionEdges
      .map((edge) => ({
        row: 0,
        col: 0,
        kind: "mid-edge" as const,
        edge
      }))
      .filter(
        (clue) => getCellLoopClueState(level, clue, solved) === "matched"
      );
    return [...cells, ...edges];
  }
  if (level.mode === "geradeweg") {
    return Array.from(
      { length: level.rows * level.cols },
      (_, index) => ({
        row: Math.floor(index / level.cols),
        col: index % level.cols
      })
    ).flatMap((point): CellLoopClue[] => {
      const turn = isTurnOnSolution(level, point);
      if (
        (geradewegClueStyle === "straight" && turn) ||
        (geradewegClueStyle === "turn" && !turn)
      ) {
        return [];
      }
      const clue = Array.from(
        { length: Math.max(level.rows, level.cols) * 2 },
        (_, index) => ({
          ...point,
          kind: "length" as const,
          value: index + 1
        })
      ).find(
        (candidate) =>
          getCellLoopClueState(level, candidate, solved) === "matched"
      );
      return clue ? [clue] : [];
    });
  }
  if (level.mode === "shingoki") {
    const clues = Array.from(
      { length: level.rows * level.cols },
      (_, index) => ({
        row: Math.floor(index / level.cols),
        col: index % level.cols
      })
    ).flatMap((point): CellLoopClue[] => {
      const kind: CellLoopClue["kind"] = isTurnOnSolution(level, point)
        ? "black"
        : "white";
      const clue = Array.from(
        { length: Math.max(level.rows, level.cols) * 2 },
        (_, index) => ({
          ...point,
          kind,
          value: index + 2
        })
      ).find(
        (candidate) =>
          getCellLoopClueState(level, candidate, solved) === "matched"
      );
      if (!clue) return [];
      return [clue];
    });
    if (balanceClueStyle === "plain" || balanceClueStyle === "numbered") {
      return clues;
    }
    if (balanceClueStyle.startsWith("mixed") && clues.length > 0) {
      const requestedGrayCount = Number(balanceClueStyle.split("-")[1] ?? 1);
      const grayIndexes = new Set(
        shuffled(
          Array.from({ length: clues.length }, (_, index) => index),
          random
        ).slice(0, Math.min(requestedGrayCount, clues.length))
      );
      return clues.map((clue, index) =>
        grayIndexes.has(index) ? { ...clue, kind: "gray" } : clue
      );
    }
    return clues.map((clue) => ({ ...clue, kind: "gray" }));
  }
  return Array.from(
    { length: level.rows * level.cols },
    (_, index) => ({
      row: Math.floor(index / level.cols),
      col: index % level.cols
    })
  ).flatMap((point) => {
    for (const kind of ["white", "black"] as const) {
      const plain: CellLoopClue = { ...point, kind };
      if (getCellLoopClueState(level, plain, solved) !== "matched") continue;
      if (balanceClueStyle === "plain") return [plain];

      const numbered = Array.from({ length: 16 }, (_, index) => ({
        ...plain,
        value: index + 2
      })).find(
        (clue) => getCellLoopClueState(level, clue, solved) === "matched"
      );
      if (!numbered) return [];
      return balanceClueStyle === "numbered" || random() < 0.5
        ? [numbered]
        : [plain];
    }
    return [];
  });
}

function shuffled<T>(values: T[], random: () => number): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

function solutionNeighbors(
  level: CellLoopLevel,
  point: Point
): Point[] {
  const solution = new Set(level.solutionEdges);
  return [
    {
      edge: `cv:${point.row - 1}:${point.col}`,
      point: { row: point.row - 1, col: point.col }
    },
    {
      edge: `ch:${point.row}:${point.col}`,
      point: { row: point.row, col: point.col + 1 }
    },
    {
      edge: `cv:${point.row}:${point.col}`,
      point: { row: point.row + 1, col: point.col }
    },
    {
      edge: `ch:${point.row}:${point.col - 1}`,
      point: { row: point.row, col: point.col - 1 }
    }
  ].flatMap(({ edge, point: neighbor }) =>
    solution.has(edge as CellEdgeKey) ? [neighbor] : []
  );
}

function straightSegmentKey(
  level: CellLoopLevel,
  origin: Point
): string | null {
  const neighbors = solutionNeighbors(level, origin);
  if (neighbors.length !== 2 || isTurnOnSolution(level, origin)) return null;

  const endpoint = (first: Point): Point => {
    let previous = origin;
    let current = first;
    while (true) {
      const next = solutionNeighbors(level, current).find(
        (candidate) =>
          candidate.row !== previous.row || candidate.col !== previous.col
      );
      if (
        !next ||
        Math.sign(current.row - previous.row) !==
          Math.sign(next.row - current.row) ||
        Math.sign(current.col - previous.col) !==
          Math.sign(next.col - current.col)
      ) {
        return current;
      }
      previous = current;
      current = next;
    }
  };

  return neighbors
    .map(endpoint)
    .map((point) => `${point.row}:${point.col}`)
    .sort()
    .join("-");
}

function hasClueFeature(
  level: CellLoopLevel,
  clues: CellLoopClue[],
  feature: string
): boolean {
  if (feature === "all") return true;
  if (feature === "mixed") {
    return (
      clues.some((clue) => isTurnOnSolution(level, clue)) &&
      clues.some((clue) => !isTurnOnSolution(level, clue))
    );
  }
  if (feature === "gray") {
    return clues.some((clue) => clue.kind === "gray");
  }
  if (feature.startsWith("mixed-gray-")) {
    const minimumGray = Number(feature.slice("mixed-gray-".length));
    return (
      clues.filter((clue) => clue.kind === "gray").length >= minimumGray &&
      clues.some((clue) => clue.kind === "white") &&
      clues.some((clue) => clue.kind === "black")
    );
  }
  if (feature === "mixed-gray") {
    return (
      clues.some((clue) => clue.kind === "gray") &&
      clues.some((clue) => clue.kind === "white") &&
      clues.some((clue) => clue.kind === "black")
    );
  }
  if (feature === "shared-straight") {
    const counts = new Map<string, number>();
    for (const clue of clues) {
      const segment = straightSegmentKey(level, clue);
      if (segment) counts.set(segment, (counts.get(segment) ?? 0) + 1);
    }
    return [...counts.values()].some((count) => count >= 2);
  }
  if (feature === "edge-large") {
    return clues.some(
      (clue) =>
        (clue.value ?? 0) >= 4 &&
        (clue.row === 0 ||
          clue.row === level.rows - 1 ||
          clue.col === 0 ||
          clue.col === level.cols - 1)
    );
  }
  if (feature === "varied-lengths") {
    return new Set(clues.map((clue) => clue.value)).size >= 3;
  }
  const keys = new Set(
    clues
      .filter((clue) =>
        feature === "white-run" ? clue.kind === "white" : clue.kind === "black"
      )
      .map((clue) => `${clue.row}:${clue.col}`)
  );
  return clues.some((clue) => {
    if (feature === "adjacent-black") {
      return (
        clue.kind === "black" &&
        [[-1, 0], [0, 1], [1, 0], [0, -1]].some(([row, col]) =>
          keys.has(`${clue.row + row}:${clue.col + col}`)
        )
      );
    }
    if (feature === "white-run" && clue.kind === "white") {
      return (
        (keys.has(`${clue.row}:${clue.col + 1}`) &&
          keys.has(`${clue.row}:${clue.col + 2}`)) ||
        (keys.has(`${clue.row + 1}:${clue.col}`) &&
          keys.has(`${clue.row + 2}:${clue.col}`))
      );
    }
    return false;
  });
}

function minimizeClues(
  level: CellLoopLevel,
  candidates: CellLoopClue[],
  random: () => number,
  minimumBlack: number,
  minimumWhite: number,
  minimumClues: number,
  requiredFeature: string
): { clues: CellLoopClue[]; nodes: number } | null {
  let clues = [...candidates];
  const full = solveCellLoop({ ...level, loopClues: clues }, 2, 500_000);
  if (full.aborted || full.count !== 1) return null;

  for (const candidate of shuffled(candidates, random)) {
    if (clues.length <= minimumClues) continue;
    const sameKindCount = clues.filter(
      (clue) => clue.kind === candidate.kind
    ).length;
    if (
      (candidate.kind === "black" && sameKindCount <= minimumBlack) ||
      (candidate.kind === "white" && sameKindCount <= minimumWhite)
    ) {
      continue;
    }
    const next = clues.filter((clue) => clue !== candidate);
    if (!hasClueFeature(level, next, requiredFeature)) continue;
    const result = solveCellLoop(
      { ...level, loopClues: next },
      2,
      500_000
    );
    if (!result.aborted && result.count === 1) clues = next;
  }
  const result = solveCellLoop({ ...level, loopClues: clues }, 2, 2_000_000);
  return result.count === 1 && !result.aborted
    ? { clues, nodes: result.nodes }
    : null;
}

const mode = (process.argv[2] ?? "masyu") as Extract<
  CellLoopMode,
  "masyu" | "midloop" | "balance-loop" | "geradeweg" | "shingoki"
>;
const attempts = Number(process.argv[3] ?? 100);
const random = randomSource(Number(process.argv[4] ?? 20260904));
const rows = Number(process.argv[5] ?? 7);
const cols = Number(process.argv[6] ?? rows);
const minimumBlack = Number(process.argv[7] ?? 0);
const minimumWhite = Number(process.argv[8] ?? 0);
const minimumClues = Number(process.argv[9] ?? 0);
const clueKind = process.argv[10] ?? "all";
const resultLimit = Number(process.argv[11] ?? 5);
const requiredFeature = process.argv[12] ?? "all";
const sourceLevelId = Number(process.argv[13] ?? 0);
const clueStyle = process.argv[14] ?? "numbered";
const minimumCoverage = Number(process.argv[15] ?? 0.62);
const maximumCoverage = Number(process.argv[16] ?? 0.84);
const balanceClueStyle = clueStyle as BalanceClueStyle;
const geradewegClueStyle = clueStyle as GeradewegClueStyle;
const sourceLevel = CELL_LOOP_LEVELS.find((level) => level.id === sourceLevelId);
const results: Array<{
  clues: CellLoopClue[];
  nodes: number;
  solutionEdges: CellEdgeKey[];
}> = [];

for (let attempt = 0; attempt < attempts; attempt += 1) {
  const target = Math.floor(
    rows * cols *
      (minimumCoverage + random() * (maximumCoverage - minimumCoverage))
  );
  const solutionEdges = sourceLevel
    ? [...sourceLevel.solutionEdges]
    : loopEdgesFromPath(growLoop(rows, cols, target, random));
  const level = makeLevel(mode, rows, cols, solutionEdges);
  if (!validateCellLoop(level, solutionMarks(level)).complete) continue;
  const candidates = clueCandidates(
    level,
    balanceClueStyle,
    geradewegClueStyle,
    random
  ).filter((clue) => clueKind === "all" || clue.kind === clueKind);
  if (
    candidates.filter((clue) => clue.kind === "black").length < minimumBlack ||
    candidates.filter((clue) => clue.kind === "white").length < minimumWhite
  ) {
    continue;
  }
  const minimized = minimizeClues(
    level,
    candidates,
    random,
    minimumBlack,
    minimumWhite,
    minimumClues,
    requiredFeature
  );
  if (!minimized) continue;
  if (!hasClueFeature(level, minimized.clues, requiredFeature)) continue;
  results.push({ ...minimized, solutionEdges });
  results.sort((first, second) => second.nodes - first.nodes);
  results.length = Math.min(results.length, resultLimit);
}

results.forEach((result) => {
  console.log(
    JSON.stringify({
      mode,
      clueStyle: balanceClueStyle,
      rows,
      cols,
      nodes: result.nodes,
      clues: result.clues,
      solutionEdges: result.solutionEdges.join(" ")
    })
  );
});
