import type { NumberlinkLevel, Point, PuzzleMode } from "./game";
import type { EdgeMap, EdgeMark } from "./slitherlink";

export type CellEdgeKey = `ch:${number}:${number}` | `cv:${number}:${number}`;
export type PipeDirection = "up" | "right" | "down" | "left";
export type PipeClue = {
  row: number;
  col: number;
  directions: PipeDirection[];
};
export type CellLoopMode = Extract<
  PuzzleMode,
  "pipelink" | "masyu" | "midloop" | "balance-loop" | "geradeweg" | "shingoki"
>;
export type LoopClueKind =
  | "white"
  | "black"
  | "gray"
  | "mid-cell"
  | "mid-edge"
  | "length";

export type CellLoopClue = {
  row: number;
  col: number;
  kind: LoopClueKind;
  value?: number;
  edge?: CellEdgeKey;
};

export type CellLoopLevel = Omit<
  NumberlinkLevel,
  "mode" | "chapter" | "solutionEdges"
> & {
  mode: CellLoopMode;
  chapter: 5 | 8 | 9 | 10 | 11 | 12;
  blockedCells: Point[];
  prefilledEdges: CellEdgeKey[];
  pipeClues?: PipeClue[];
  loopClues: CellLoopClue[];
  solutionEdges: CellEdgeKey[];
};

export type CellEdgeGeometry = {
  key: CellEdgeKey;
  orientation: "h" | "v";
  start: Point;
  end: Point;
};

type LoopAnalysis = {
  neighbors: Map<string, Point[]>;
  degree: Map<string, number>;
};

export function cellKey(point: Point): string {
  return `${point.row}:${point.col}`;
}

export function isCellLoopLevel(
  level: NumberlinkLevel
): level is CellLoopLevel {
  return [
    "pipelink",
    "masyu",
    "midloop",
    "balance-loop",
    "geradeweg",
    "shingoki"
  ].includes(level.mode);
}

export function edgeBetween(start: Point, end: Point): CellEdgeKey {
  if (start.row === end.row) {
    return `ch:${start.row}:${Math.min(start.col, end.col)}`;
  }
  return `cv:${Math.min(start.row, end.row)}:${start.col}`;
}

export function getCellLoopEdges(
  rows: number,
  cols: number,
  blockedCells: Point[] = []
): CellEdgeGeometry[] {
  const blocked = new Set(blockedCells.map(cellKey));
  const edges: CellEdgeGeometry[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const start = { row, col };
      if (blocked.has(cellKey(start))) continue;
      if (col + 1 < cols && !blocked.has(`${row}:${col + 1}`)) {
        edges.push({
          key: `ch:${row}:${col}`,
          orientation: "h",
          start,
          end: { row, col: col + 1 }
        });
      }
      if (row + 1 < rows && !blocked.has(`${row + 1}:${col}`)) {
        edges.push({
          key: `cv:${row}:${col}`,
          orientation: "v",
          start,
          end: { row: row + 1, col }
        });
      }
    }
  }

  return edges;
}

export function loopEdgesFromPath(path: Point[]): CellEdgeKey[] {
  return path.map((point, index) =>
    edgeBetween(point, path[(index + 1) % path.length])
  );
}

const PIPE_DIRECTIONS: PipeDirection[] = ["up", "right", "down", "left"];

function pipeEdgeAt(
  point: Point,
  direction: PipeDirection
): CellEdgeKey {
  if (direction === "up") return `cv:${point.row - 1}:${point.col}`;
  if (direction === "right") return `ch:${point.row}:${point.col}`;
  if (direction === "down") return `cv:${point.row}:${point.col}`;
  return `ch:${point.row}:${point.col - 1}`;
}

export function getPipeCellDirections(
  level: CellLoopLevel,
  marks: EdgeMap,
  point: Point
): PipeDirection[] {
  const available = new Set(
    getCellLoopEdges(level.rows, level.cols, level.blockedCells).map(
      (edge) => edge.key
    )
  );
  return PIPE_DIRECTIONS.filter((direction) => {
    const edge = pipeEdgeAt(point, direction);
    return available.has(edge) && marks[edge] === "line";
  });
}

function sameDirections(
  first: PipeDirection[],
  second: PipeDirection[]
): boolean {
  return (
    first.length === second.length &&
    first.every((direction) => second.includes(direction))
  );
}

export function pipeClueEdges(level: CellLoopLevel): CellEdgeKey[] {
  const available = new Set(
    getCellLoopEdges(level.rows, level.cols, level.blockedCells).map(
      (edge) => edge.key
    )
  );
  return [
    ...new Set(
      (level.pipeClues ?? []).flatMap((clue) =>
        clue.directions
          .map((direction) => pipeEdgeAt(clue, direction))
          .filter((edge) => available.has(edge))
      )
    )
  ];
}

function validatePipelink(
  level: CellLoopLevel,
  marks: EdgeMap
): { complete: boolean; reason?: string } {
  const blocked = new Set(level.blockedCells.map(cellKey));
  const selectedEdges = getCellLoopEdges(
    level.rows,
    level.cols,
    level.blockedCells
  ).filter((edge) => marks[edge.key] === "line");

  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      if (blocked.has(`${row}:${col}`)) continue;
      const directions = getPipeCellDirections(level, marks, { row, col });
      if (directions.length !== 2 && directions.length !== 4) {
        return { complete: false, reason: "uncovered-cell" };
      }
    }
  }

  for (const clue of level.pipeClues ?? []) {
    if (
      !sameDirections(
        getPipeCellDirections(level, marks, clue),
        clue.directions
      )
    ) {
      return { complete: false, reason: "pipe-clue-mismatch" };
    }
  }

  if (selectedEdges.length === 0) {
    return { complete: false, reason: "empty-loop" };
  }

  // At a crossing the horizontal and vertical routes pass through independently.
  const routeLinks = new Map<CellEdgeKey, CellEdgeKey[]>();
  const link = (first: CellEdgeKey, second: CellEdgeKey) => {
    routeLinks.set(first, [...(routeLinks.get(first) ?? []), second]);
    routeLinks.set(second, [...(routeLinks.get(second) ?? []), first]);
  };
  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      if (blocked.has(`${row}:${col}`)) continue;
      const point = { row, col };
      const directions = getPipeCellDirections(level, marks, point);
      if (directions.length === 2) {
        link(
          pipeEdgeAt(point, directions[0]),
          pipeEdgeAt(point, directions[1])
        );
      } else {
        link(pipeEdgeAt(point, "up"), pipeEdgeAt(point, "down"));
        link(pipeEdgeAt(point, "left"), pipeEdgeAt(point, "right"));
      }
    }
  }

  const firstEdge = selectedEdges[0].key;
  const queue = [firstEdge];
  const visited = new Set([firstEdge]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    for (const next of routeLinks.get(queue[cursor]) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  if (visited.size !== selectedEdges.length) {
    return { complete: false, reason: "multiple-loops" };
  }

  return { complete: true };
}

function direction(from: Point, to: Point): string {
  return `${Math.sign(to.row - from.row)}:${Math.sign(to.col - from.col)}`;
}

function buildAnalysis(level: CellLoopLevel, marks: EdgeMap): LoopAnalysis {
  const neighbors = new Map<string, Point[]>();
  const degree = new Map<string, number>();

  getCellLoopEdges(level.rows, level.cols, level.blockedCells).forEach((edge) => {
    if (marks[edge.key] !== "line") return;
    const startKey = cellKey(edge.start);
    const endKey = cellKey(edge.end);
    neighbors.set(startKey, [...(neighbors.get(startKey) ?? []), edge.end]);
    neighbors.set(endKey, [...(neighbors.get(endKey) ?? []), edge.start]);
    degree.set(startKey, (degree.get(startKey) ?? 0) + 1);
    degree.set(endKey, (degree.get(endKey) ?? 0) + 1);
  });

  return { neighbors, degree };
}

function isStraight(analysis: LoopAnalysis, point: Point): boolean {
  const neighbors = analysis.neighbors.get(cellKey(point)) ?? [];
  if (neighbors.length !== 2) return false;
  return (
    neighbors[0].row === neighbors[1].row ||
    neighbors[0].col === neighbors[1].col
  );
}

function isTurn(analysis: LoopAnalysis, point: Point): boolean {
  const neighbors = analysis.neighbors.get(cellKey(point)) ?? [];
  return neighbors.length === 2 && !isStraight(analysis, point);
}

function armLength(
  analysis: LoopAnalysis,
  origin: Point,
  first: Point
): number {
  let previous = origin;
  let current = first;
  let length = 1;

  for (let guard = 0; guard < 100; guard += 1) {
    const neighbors = analysis.neighbors.get(cellKey(current)) ?? [];
    if (neighbors.length !== 2) return length;
    const next = neighbors.find((point) => cellKey(point) !== cellKey(previous));
    if (!next) return length;
    if (direction(previous, current) !== direction(current, next)) return length;
    previous = current;
    current = next;
    length += 1;
  }

  return length;
}

function clueMatches(
  level: CellLoopLevel,
  clue: CellLoopClue,
  marks: EdgeMap,
  analysis: LoopAnalysis
): boolean | null {
  if (clue.kind === "mid-edge") {
    if (!clue.edge || marks[clue.edge] !== "line") return null;
    const edge = getCellLoopEdges(
      level.rows,
      level.cols,
      level.blockedCells
    ).find((candidate) => candidate.key === clue.edge);
    if (!edge) return false;
    const startNeighbors = analysis.neighbors
      .get(cellKey(edge.start))
      ?.filter((point) => cellKey(point) !== cellKey(edge.end));
    const endNeighbors = analysis.neighbors
      .get(cellKey(edge.end))
      ?.filter((point) => cellKey(point) !== cellKey(edge.start));
    if (startNeighbors?.length !== 1 || endNeighbors?.length !== 1) return null;
    const startLength =
      direction(startNeighbors[0], edge.start) === direction(edge.start, edge.end)
        ? armLength(analysis, edge.start, startNeighbors[0])
        : 0;
    const endLength =
      direction(edge.start, edge.end) === direction(edge.end, endNeighbors[0])
        ? armLength(analysis, edge.end, endNeighbors[0])
        : 0;
    return startLength === endLength;
  }

  const point = { row: clue.row, col: clue.col };
  const neighbors = analysis.neighbors.get(cellKey(point)) ?? [];
  if (neighbors.length < 2) return null;
  if (neighbors.length > 2) return false;
  const arms = neighbors.map((neighbor) => armLength(analysis, point, neighbor));

  if (clue.kind === "mid-cell") {
    return isStraight(analysis, point) && arms[0] === arms[1];
  }

  if (level.mode === "masyu") {
    if (clue.kind === "white") {
      return (
        isStraight(analysis, point) &&
        neighbors.some((neighbor) => isTurn(analysis, neighbor))
      );
    }
    return (
      clue.kind === "black" &&
      isTurn(analysis, point) &&
      neighbors.every((neighbor) => isStraight(analysis, neighbor))
    );
  }

  if (level.mode === "balance-loop") {
    const shapeMatches =
      clue.kind === "white" ? arms[0] === arms[1] : arms[0] !== arms[1];
    return (
      shapeMatches &&
      (clue.value === undefined || arms[0] + arms[1] === clue.value)
    );
  }

  if (level.mode === "geradeweg") {
    if (clue.value === undefined) return false;
    return isStraight(analysis, point)
      ? arms[0] + arms[1] === clue.value
      : arms[0] === clue.value && arms[1] === clue.value;
  }

  if (level.mode === "shingoki") {
    const shapeMatches =
      clue.kind === "gray" ||
      (clue.kind === "white" && isStraight(analysis, point)) ||
      (clue.kind === "black" && isTurn(analysis, point));
    return (
      shapeMatches &&
      clue.value !== undefined &&
      arms[0] + arms[1] === clue.value
    );
  }

  return false;
}

export function getCellLoopClueState(
  level: CellLoopLevel,
  clue: CellLoopClue,
  marks: EdgeMap
): "pending" | "matched" | "invalid" {
  const result = clueMatches(level, clue, marks, buildAnalysis(level, marks));
  return result === null ? "pending" : result ? "matched" : "invalid";
}

export function validateCellLoop(
  level: CellLoopLevel,
  marks: EdgeMap
): { complete: boolean; reason?: string } {
  if (level.mode === "pipelink") return validatePipelink(level, marks);

  const analysis = buildAnalysis(level, marks);
  if (
    level.prefilledEdges.some((edge) => marks[edge] !== "line")
  ) {
    return { complete: false, reason: "missing-prefilled" };
  }

  const usedVertices = [...analysis.degree.entries()].filter(([, degree]) => degree > 0);
  if (usedVertices.length === 0) return { complete: false, reason: "empty-loop" };
  if (usedVertices.some(([, degree]) => degree !== 2)) {
    return { complete: false, reason: "open-or-branching" };
  }

  const [start] = usedVertices[0];
  const queue = [start];
  const visited = new Set([start]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    for (const point of analysis.neighbors.get(queue[cursor]) ?? []) {
      const next = cellKey(point);
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  if (visited.size !== usedVertices.length) {
    return { complete: false, reason: "multiple-loops" };
  }

  if (
    level.loopClues.some(
      (clue) => clueMatches(level, clue, marks, analysis) !== true
    )
  ) {
    return { complete: false, reason: "clue-mismatch" };
  }

  return { complete: true };
}

export function findCellLoopConflict(
  level: CellLoopLevel,
  marks: EdgeMap
): string | null {
  if (level.mode === "pipelink") {
    const edges = getCellLoopEdges(level.rows, level.cols, level.blockedCells);
    const available = new Set(edges.map((edge) => edge.key));
    const clueByCell = new Map(
      (level.pipeClues ?? []).map((clue) => [cellKey(clue), clue])
    );
    const blocked = new Set(level.blockedCells.map(cellKey));

    for (let row = 0; row < level.rows; row += 1) {
      for (let col = 0; col < level.cols; col += 1) {
        if (blocked.has(`${row}:${col}`)) continue;
        const point = { row, col };
        const incident = PIPE_DIRECTIONS.flatMap((direction) => {
          const edge = pipeEdgeAt(point, direction);
          return available.has(edge) ? [{ direction, edge }] : [];
        });
        const clue = clueByCell.get(cellKey(point));
        const patterns: PipeDirection[][] = clue
          ? [clue.directions]
          : [
              ["up", "right"],
              ["up", "down"],
              ["up", "left"],
              ["right", "down"],
              ["right", "left"],
              ["down", "left"],
              ["up", "right", "down", "left"]
            ];
        const possible = patterns.some(
          (pattern) =>
            pattern.every((direction) =>
              incident.some((entry) => entry.direction === direction)
            ) &&
            incident.every(({ direction, edge }) => {
              const mark = marks[edge];
              return (
                mark === undefined ||
                (mark === "line") === pattern.includes(direction)
              );
            })
        );
        if (!possible) {
          return clue ? "固定管件方向不能改变" : "该格无法形成有效管道";
        }
      }
    }
    return null;
  }

  const analysis = buildAnalysis(level, marks);
  if ([...analysis.degree.values()].some((degree) => degree > 2)) {
    return "线条不能分叉";
  }

  for (const clue of level.loopClues) {
    if ((analysis.degree.get(`${clue.row}:${clue.col}`) ?? 0) > 2) {
      return "提示点不能分叉";
    }
  }

  return null;
}

export function cellLoopProgress(
  level: CellLoopLevel,
  marks: EdgeMap
): {
  lineCount: number;
  matchedClues: number;
  clueCount: number;
  visitedCells: number;
  availableCells: number;
} {
  const analysis = buildAnalysis(level, marks);
  const blocked = new Set(level.blockedCells.map(cellKey));
  return {
    lineCount: Object.values(marks).filter((mark) => mark === "line").length,
    matchedClues: level.loopClues.filter(
      (clue) => clueMatches(level, clue, marks, analysis) === true
    ).length,
    clueCount: level.loopClues.length,
    visitedCells: [...analysis.degree.values()].filter((degree) => degree > 0).length,
    availableCells: level.rows * level.cols - blocked.size
  };
}

export function solutionMarks(level: CellLoopLevel): EdgeMap {
  return Object.fromEntries([
    ...level.solutionEdges.map((edge) => [edge, "line" as EdgeMark]),
    ...level.prefilledEdges.map((edge) => [edge, "line" as EdgeMark]),
    ...pipeClueEdges(level).map((edge) => [edge, "line" as EdgeMark])
  ]);
}
