import {
  getCellLoopEdges,
  type CellEdgeKey,
  type CellLoopClue,
  type CellLoopLevel
} from "../src/cellLoop";
import { solveCellLoop } from "./verify-cell-loops";

declare const process: {
  argv: string[];
  exitCode?: number;
};

function edgeForClue(
  row: number,
  col: number,
  marker: ">" | "V" | "<" | "^"
): CellEdgeKey {
  if (marker === ">") return `ch:${row}:${col}`;
  if (marker === "<") return `ch:${row}:${col - 1}`;
  if (marker === "V") return `cv:${row}:${col}`;
  return `cv:${row - 1}:${col}`;
}

function cropLevel(
  level: CellLoopLevel,
  top: number,
  left: number,
  rows: number,
  cols: number
): CellLoopLevel {
  const loopClues = level.loopClues.flatMap((clue): CellLoopClue[] => {
    if (clue.kind === "mid-cell") {
      if (
        clue.row < top ||
        clue.row >= top + rows ||
        clue.col < left ||
        clue.col >= left + cols
      ) {
        return [];
      }
      return [{ ...clue, row: clue.row - top, col: clue.col - left }];
    }

    const [orientation, rowValue, colValue] = clue.edge!.split(":");
    const row = Number(rowValue);
    const col = Number(colValue);
    const inside =
      orientation === "ch"
        ? row >= top &&
          row < top + rows &&
          col >= left &&
          col + 1 < left + cols
        : row >= top &&
          row + 1 < top + rows &&
          col >= left &&
          col < left + cols;
    if (!inside) return [];
    return [{
      ...clue,
      edge: `${orientation}:${row - top}:${col - left}` as CellEdgeKey
    }];
  });

  return { ...level, rows, cols, loopClues };
}

function parseDescriptor(input: string): CellLoopLevel {
  const [descriptor, crop] = input.split("@");
  const match = descriptor.match(/^(\d+)x(\d+):(.+)$/);
  if (!match) throw new Error(`Invalid Mid-loop descriptor: ${descriptor}`);
  const cols = Number(match[1]);
  const rows = Number(match[2]);
  const encodedRows = match[3].split(".");
  if (encodedRows.length !== rows) {
    throw new Error(`Expected ${rows} rows, received ${encodedRows.length}`);
  }

  const loopClues: CellLoopClue[] = [];
  encodedRows.forEach((encoded, row) => {
    let col = 0;
    for (const marker of encoded) {
      if (marker >= "a" && marker <= "z") {
        col += marker.charCodeAt(0) - 96;
        continue;
      }
      if (marker === "*") {
        loopClues.push({ row, col, kind: "mid-cell" });
      } else if ([">", "V", "<", "^"].includes(marker)) {
        loopClues.push({
          row: 0,
          col: 0,
          kind: "mid-edge",
          edge: edgeForClue(
            row,
            col,
            marker as ">" | "V" | "<" | "^"
          )
        });
      } else {
        throw new Error(`Unknown marker "${marker}" at ${row}:${col}`);
      }
      col += 1;
    }
    if (col !== cols) {
      throw new Error(`Row ${row} expands to ${col} cells, expected ${cols}`);
    }
  });

  const level: CellLoopLevel = {
    id: 0,
    chapter: 9,
    chapterTitle: "中环",
    mode: "midloop",
    title: "重构候选",
    difficulty: "候选",
    rows,
    cols,
    colors: [],
    endpoints: {},
    solution: {},
    blockedCells: [],
    prefilledEdges: [],
    loopClues,
    solutionEdges: []
  };
  if (!crop) return level;

  const values = crop.split(",").map(Number);
  if (values.length !== 4 || values.some(Number.isNaN)) {
    throw new Error(`Invalid crop "${crop}"`);
  }
  return cropLevel(level, values[0], values[1], values[2], values[3]);
}

function clueKey(clue: CellLoopClue): string {
  return clue.kind === "mid-edge"
    ? `edge:${clue.edge}`
    : `cell:${clue.row}:${clue.col}`;
}

function printMutationCandidates(descriptor: string, limit: number) {
  const level = parseDescriptor(descriptor);
  const original = solveCellLoop(level, 2, 5_000_000);
  if (original.count !== 1 || !original.firstSolution) {
    throw new Error("The mutation source must have exactly one solution.");
  }
  const originalSignature = original.firstSolution.slice().sort().join(",");
  const existing = new Set(level.loopClues.map(clueKey));
  const additions: CellLoopClue[] = [
    ...Array.from({ length: level.rows * level.cols }, (_, index) => ({
      row: Math.floor(index / level.cols),
      col: index % level.cols,
      kind: "mid-cell" as const
    })),
    ...getCellLoopEdges(level.rows, level.cols).map((edge) => ({
      row: 0,
      col: 0,
      kind: "mid-edge" as const,
      edge: edge.key
    }))
  ].filter((clue) => !existing.has(clueKey(clue)));
  const seen = new Set<string>();
  let found = 0;

  for (let removed = 0; removed < level.loopClues.length; removed += 1) {
    for (const addition of additions) {
      const loopClues = level.loopClues
        .filter((_, index) => index !== removed)
        .concat(addition);
      const result = solveCellLoop(
        { ...level, loopClues },
        2,
        500_000
      );
      if (result.aborted || result.count !== 1 || !result.firstSolution) continue;
      const signature = result.firstSolution.slice().sort().join(",");
      if (signature === originalSignature || seen.has(signature)) continue;
      seen.add(signature);
      console.log(
        JSON.stringify({
          rows: level.rows,
          cols: level.cols,
          nodes: result.nodes,
          clues: loopClues,
          solutionEdges: result.firstSolution
        })
      );
      found += 1;
      if (found >= limit) return;
    }
  }
}

function printRelaxedCandidates(
  descriptor: string,
  maximumRemoved: number,
  limit: number,
  minimumRemoved = 1
) {
  const level = parseDescriptor(descriptor);
  const seen = new Set<string>();
  let found = 0;

  const check = (removed: Set<number>) => {
    const loopClues = level.loopClues.filter(
      (_, index) => !removed.has(index)
    );
    const result = solveCellLoop(
      { ...level, loopClues },
      2,
      500_000
    );
    if (result.aborted || result.count !== 1 || !result.firstSolution) return;
    const signature = result.firstSolution.slice().sort().join(",");
    if (seen.has(signature)) return;
    seen.add(signature);
    console.log(
      JSON.stringify({
        rows: level.rows,
        cols: level.cols,
        removed: [...removed],
        nodes: result.nodes,
        clues: loopClues,
        solutionEdges: result.firstSolution
      })
    );
    found += 1;
  };

  const visit = (start: number, remaining: number, removed: Set<number>) => {
    if (found >= limit) return;
    if (remaining === 0) {
      check(removed);
      return;
    }
    for (
      let index = start;
      index <= level.loopClues.length - remaining;
      index += 1
    ) {
      removed.add(index);
      visit(index + 1, remaining - 1, removed);
      removed.delete(index);
      if (found >= limit) return;
    }
  };

  for (
    let count = minimumRemoved;
    count <= maximumRemoved && found < limit;
    count += 1
  ) {
    visit(0, count, new Set());
  }
}

function printCellOnlyCandidates(
  rows: number,
  cols: number,
  minimumClues: number,
  maximumClues: number,
  limit: number
) {
  const cells = Array.from({ length: rows * cols }, (_, index) => ({
    row: Math.floor(index / cols),
    col: index % cols,
    kind: "mid-cell" as const
  }));
  const seen = new Set<string>();
  let found = 0;

  const check = (indexes: number[]) => {
    const level: CellLoopLevel = {
      id: 0,
      chapter: 9,
      chapterTitle: "中环",
      mode: "midloop",
      title: "格心候选",
      difficulty: "候选",
      rows,
      cols,
      colors: [],
      endpoints: {},
      solution: {},
      blockedCells: [],
      prefilledEdges: [],
      loopClues: indexes.map((index) => cells[index]),
      solutionEdges: []
    };
    const result = solveCellLoop(level, 2, 500_000);
    if (result.aborted || result.count !== 1 || !result.firstSolution) return;
    const signature = result.firstSolution.slice().sort().join(",");
    if (seen.has(signature)) return;
    seen.add(signature);
    console.log(
      JSON.stringify({
        rows,
        cols,
        nodes: result.nodes,
        clues: level.loopClues,
        solutionEdges: result.firstSolution
      })
    );
    found += 1;
  };

  const visit = (
    start: number,
    remaining: number,
    indexes: number[]
  ) => {
    if (found >= limit) return;
    if (remaining === 0) {
      check(indexes);
      return;
    }
    for (
      let index = start;
      index <= cells.length - remaining;
      index += 1
    ) {
      indexes.push(index);
      visit(index + 1, remaining - 1, indexes);
      indexes.pop();
      if (found >= limit) return;
    }
  };

  for (
    let clueCount = minimumClues;
    clueCount <= maximumClues && found < limit;
    clueCount += 1
  ) {
    visit(0, clueCount, []);
  }
}

const args = process.argv.slice(2);
if (args[0] === "--mutate") {
  if (!args[1]) throw new Error("Pass a Mid-loop descriptor to mutate.");
  printMutationCandidates(args[1], Number(args[2] ?? 10));
  process.exitCode = 0;
} else if (args[0] === "--relax") {
  if (!args[1]) throw new Error("Pass a cropped Mid-loop descriptor.");
  printRelaxedCandidates(
    args[1],
    Number(args[2] ?? 4),
    Number(args[3] ?? 10),
    Number(args[4] ?? 1)
  );
  process.exitCode = 0;
} else if (args[0] === "--cell-search") {
  printCellOnlyCandidates(
    Number(args[1] ?? 4),
    Number(args[2] ?? args[1] ?? 4),
    Number(args[3] ?? 3),
    Number(args[4] ?? 8),
    Number(args[5] ?? 10)
  );
  process.exitCode = 0;
} else {
  const descriptors = args;
  if (descriptors.length === 0) {
    throw new Error("Pass one or more Mid-loop descriptors.");
  }

  for (const descriptor of descriptors) {
    const level = parseDescriptor(descriptor);
    const result = solveCellLoop(level, 2, 5_000_000);
    console.log(
      JSON.stringify({
        rows: level.rows,
        cols: level.cols,
        clues: level.loopClues,
        count: result.count,
        nodes: result.nodes,
        aborted: result.aborted,
        solutionEdges: result.firstSolution ?? []
      })
    );
    if (result.aborted || result.count !== 1) process.exitCode = 1;
  }
}
