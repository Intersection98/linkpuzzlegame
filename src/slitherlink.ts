import type { NumberlinkLevel } from "./game";

export type EdgeKey = `h:${number}:${number}` | `v:${number}:${number}`;
export type EdgeMark = "line" | "cross";
export type EdgeMap = Record<string, EdgeMark>;
export type SlitherlinkClueState = "pending" | "matched" | "exceeded";

export type SlitherlinkLevel = Omit<
  NumberlinkLevel,
  "mode" | "chapter" | "clues" | "solutionEdges"
> & {
  mode: "slitherlink";
  chapter: 3;
  clues: Array<Array<number | null>>;
  solutionEdges: EdgeKey[];
};

export type EdgeGeometry = {
  key: EdgeKey;
  orientation: "h" | "v";
  row: number;
  col: number;
  vertices: [[number, number], [number, number]];
};

export function isSlitherlinkLevel(
  level: NumberlinkLevel
): level is SlitherlinkLevel {
  return (
    level.mode === "slitherlink" &&
    Array.isArray(level.clues) &&
    Array.isArray(level.solutionEdges)
  );
}

export function getSlitherlinkEdges(rows: number, cols: number): EdgeGeometry[] {
  const edges: EdgeGeometry[] = [];

  for (let row = 0; row <= rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      edges.push({
        key: `h:${row}:${col}`,
        orientation: "h",
        row,
        col,
        vertices: [[row, col], [row, col + 1]]
      });
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col <= cols; col += 1) {
      edges.push({
        key: `v:${row}:${col}`,
        orientation: "v",
        row,
        col,
        vertices: [[row, col], [row + 1, col]]
      });
    }
  }

  return edges;
}

export function getCellEdges(row: number, col: number): EdgeKey[] {
  return [
    `h:${row}:${col}`,
    `v:${row}:${col + 1}`,
    `h:${row + 1}:${col}`,
    `v:${row}:${col}`
  ];
}

function vertexKey([row, col]: [number, number]): string {
  return `${row}:${col}`;
}

function lineEdges(marks: EdgeMap): Set<string> {
  return new Set(
    Object.entries(marks)
      .filter(([, mark]) => mark === "line")
      .map(([key]) => key)
  );
}

export function countLinesAroundCell(
  marks: EdgeMap,
  row: number,
  col: number
): number {
  return getCellEdges(row, col).filter((edge) => marks[edge] === "line").length;
}

export function getSlitherlinkClueState(
  clue: number,
  lineCount: number
): SlitherlinkClueState {
  if (lineCount > clue) return "exceeded";
  if (lineCount === clue) return "matched";
  return "pending";
}

export function validateSlitherlink(
  level: SlitherlinkLevel,
  marks: EdgeMap
): { complete: boolean; reason?: string } {
  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      const clue = level.clues[row][col];
      if (clue !== null && countLinesAroundCell(marks, row, col) !== clue) {
        return { complete: false, reason: "clue-mismatch" };
      }
    }
  }

  return validateEdgeLoop(level.rows, level.cols, marks);
}

export function validateEdgeLoop(
  rows: number,
  cols: number,
  marks: EdgeMap
): { complete: boolean; reason?: string } {
  const edges = getSlitherlinkEdges(rows, cols);
  const selected = edges.filter((edge) => marks[edge.key] === "line");
  if (selected.length === 0) return { complete: false, reason: "empty-loop" };

  const neighbors = new Map<string, string[]>();
  selected.forEach((edge) => {
    const [start, end] = edge.vertices.map(vertexKey);
    neighbors.set(start, [...(neighbors.get(start) ?? []), end]);
    neighbors.set(end, [...(neighbors.get(end) ?? []), start]);
  });

  if ([...neighbors.values()].some((entries) => entries.length !== 2)) {
    return { complete: false, reason: "open-or-branching" };
  }

  const start = neighbors.keys().next().value as string;
  const queue = [start];
  const visited = new Set([start]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    for (const next of neighbors.get(queue[cursor]) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }

  if (visited.size !== neighbors.size) {
    return { complete: false, reason: "multiple-loops" };
  }

  return { complete: true };
}

export function findSlitherlinkConflict(
  level: SlitherlinkLevel,
  marks: EdgeMap
): string | null {
  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      const clue = level.clues[row][col];
      if (clue === null) continue;
      const edges = getCellEdges(row, col);
      if (edges.filter((edge) => marks[edge] !== "cross").length < clue) {
        return "该数字周围可用的边不足";
      }
    }
  }

  return findEdgeLoopConflict(level.rows, level.cols, marks);
}

export function findEdgeLoopConflict(
  rows: number,
  cols: number,
  marks: EdgeMap
): string | null {
  const degrees = new Map<string, number>();
  const availableDegrees = new Map<string, number>();
  for (const edge of getSlitherlinkEdges(rows, cols)) {
    if (marks[edge.key] !== "cross") {
      for (const vertex of edge.vertices) {
        const key = vertexKey(vertex);
        availableDegrees.set(key, (availableDegrees.get(key) ?? 0) + 1);
      }
    }
    if (marks[edge.key] !== "line") continue;
    const [start, end] = edge.vertices.map(vertexKey);
    degrees.set(start, (degrees.get(start) ?? 0) + 1);
    degrees.set(end, (degrees.get(end) ?? 0) + 1);
    if (degrees.get(start)! > 2 || degrees.get(end)! > 2) {
      return "线条不能分叉";
    }
  }
  for (const [vertex, degree] of degrees) {
    if (degree === 1 && (availableDegrees.get(vertex) ?? 0) < 2) {
      return "线头不能停在这里";
    }
  }

  return null;
}

export function slitherlinkProgress(
  level: SlitherlinkLevel,
  marks: EdgeMap
): { lineCount: number; satisfiedClues: number; clueCount: number } {
  let satisfiedClues = 0;
  let clueCount = 0;

  level.clues.forEach((row, rowIndex) => {
    row.forEach((clue, colIndex) => {
      if (clue === null) return;
      clueCount += 1;
      if (countLinesAroundCell(marks, rowIndex, colIndex) === clue) {
        satisfiedClues += 1;
      }
    });
  });

  return {
    lineCount: lineEdges(marks).size,
    satisfiedClues,
    clueCount
  };
}
