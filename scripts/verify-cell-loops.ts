import {
  cellKey,
  getCellLoopEdges,
  validateCellLoop,
  type CellLoopClue,
  type CellLoopLevel
} from "../src/cellLoop";
import { CELL_LOOP_LEVELS } from "../src/cellLoopLevels";
import type { Point } from "../src/game";
import type { EdgeMap } from "../src/slitherlink";

declare const process: {
  env: Record<string, string | undefined>;
  exitCode?: number;
};

type Bit = 0 | 1;
type Direction = 0 | 1 | 2 | 3;
type Pattern = Map<number, Bit>;

const DELTAS: ReadonlyArray<Point> = [
  { row: -1, col: 0 },
  { row: 0, col: 1 },
  { row: 1, col: 0 },
  { row: 0, col: -1 }
];

function opposite(direction: Direction): Direction {
  return ((direction + 2) % 4) as Direction;
}

function isStraightPair(first: Direction, second: Direction): boolean {
  return opposite(first) === second;
}

function move(point: Point, direction: Direction, distance = 1): Point {
  return {
    row: point.row + DELTAS[direction].row * distance,
    col: point.col + DELTAS[direction].col * distance
  };
}

export function solveCellLoop(
  level: CellLoopLevel,
  limit = 2,
  nodeLimit = 2_000_000
) {
  const edges = getCellLoopEdges(level.rows, level.cols, level.blockedCells);
  const edgeIndexes = new Map(edges.map((edge, index) => [edge.key, index]));
  const blocked = new Set(level.blockedCells.map(cellKey));
  const vertexEdges = new Map<string, number[]>();
  const directionalEdges = new Map<string, Array<number | undefined>>();

  function inBounds(point: Point): boolean {
    return (
      point.row >= 0 &&
      point.row < level.rows &&
      point.col >= 0 &&
      point.col < level.cols &&
      !blocked.has(cellKey(point))
    );
  }

  function edgeAt(point: Point, direction: Direction): number | undefined {
    return directionalEdges.get(cellKey(point))?.[direction];
  }

  edges.forEach((edge, index) => {
    const rowDelta = edge.end.row - edge.start.row;
    const colDelta = edge.end.col - edge.start.col;
    const direction = DELTAS.findIndex(
      (delta) => delta.row === rowDelta && delta.col === colDelta
    ) as Direction;
    for (const [point, pointDirection] of [
      [edge.start, direction],
      [edge.end, opposite(direction)]
    ] as const) {
      const key = cellKey(point);
      vertexEdges.set(key, [...(vertexEdges.get(key) ?? []), index]);
      const directional = directionalEdges.get(key) ?? [];
      directional[pointDirection] = index;
      directionalEdges.set(key, directional);
    }
  });

  const requiredVertices = new Set<string>();
  if (level.mode === "pipelink") {
    for (let row = 0; row < level.rows; row += 1) {
      for (let col = 0; col < level.cols; col += 1) {
        const point = { row, col };
        if (inBounds(point)) requiredVertices.add(cellKey(point));
      }
    }
  }

  function assignPattern(pattern: Pattern, edge: number, value: Bit): boolean {
    const current = pattern.get(edge);
    if (current !== undefined && current !== value) return false;
    pattern.set(edge, value);
    return true;
  }

  function setVertex(
    pattern: Pattern,
    point: Point,
    selectedDirections: Direction[]
  ): boolean {
    if (!inBounds(point)) return false;
    const selected = new Set(selectedDirections);
    for (const direction of [0, 1, 2, 3] as Direction[]) {
      const edge = edgeAt(point, direction);
      if (selected.has(direction) && edge === undefined) return false;
      if (
        edge !== undefined &&
        !assignPattern(pattern, edge, selected.has(direction) ? 1 : 0)
      ) {
        return false;
      }
    }
    return true;
  }

  function walkArm(
    pattern: Pattern,
    origin: Point,
    direction: Direction,
    length: number,
    turnDirection: Direction
  ): boolean {
    if (length < 1 || isStraightPair(direction, turnDirection)) return false;
    for (let distance = 1; distance <= length; distance += 1) {
      const point = move(origin, direction, distance);
      const selected =
        distance === length
          ? [opposite(direction), turnDirection]
          : [opposite(direction), direction];
      if (!setVertex(pattern, point, selected)) return false;
    }
    return true;
  }

  function turnChoices(direction: Direction): Direction[] {
    return [((direction + 1) % 4) as Direction, ((direction + 3) % 4) as Direction];
  }

  function pathPatterns(
    origin: Point,
    directionPair: [Direction, Direction],
    armPairs: Array<[number, number]>
  ): Pattern[] {
    const patterns: Pattern[] = [];
    for (const [firstLength, secondLength] of armPairs) {
      for (const firstTurn of turnChoices(directionPair[0])) {
        for (const secondTurn of turnChoices(directionPair[1])) {
          const pattern = new Map<number, Bit>();
          if (
            setVertex(pattern, origin, directionPair) &&
            walkArm(
              pattern,
              origin,
              directionPair[0],
              firstLength,
              firstTurn
            ) &&
            walkArm(
              pattern,
              origin,
              directionPair[1],
              secondLength,
              secondTurn
            )
          ) {
            patterns.push(pattern);
          }
        }
      }
    }
    return patterns;
  }

  function masyuPatterns(clue: CellLoopClue): Pattern[] {
    const origin = { row: clue.row, col: clue.col };
    const patterns: Pattern[] = [];
    if (clue.kind === "black") {
      for (const vertical of [0, 2] as Direction[]) {
        for (const horizontal of [1, 3] as Direction[]) {
          const pattern = new Map<number, Bit>();
          if (
            setVertex(pattern, origin, [vertical, horizontal]) &&
            setVertex(pattern, move(origin, vertical), [
              opposite(vertical),
              vertical
            ]) &&
            setVertex(pattern, move(origin, horizontal), [
              opposite(horizontal),
              horizontal
            ])
          ) {
            patterns.push(pattern);
          }
        }
      }
      return patterns;
    }

    for (const pair of [
      [0, 2],
      [1, 3]
    ] as Array<[Direction, Direction]>) {
      const neighborOptions = pair.map((direction) => [
        null,
        ...turnChoices(direction)
      ]) as Array<Array<Direction | null>>;
      for (const firstTurn of neighborOptions[0]) {
        for (const secondTurn of neighborOptions[1]) {
          if (firstTurn === null && secondTurn === null) continue;
          const pattern = new Map<number, Bit>();
          if (!setVertex(pattern, origin, pair)) continue;
          if (
            firstTurn !== null &&
            !setVertex(pattern, move(origin, pair[0]), [
              opposite(pair[0]),
              firstTurn
            ])
          ) {
            continue;
          }
          if (
            secondTurn !== null &&
            !setVertex(pattern, move(origin, pair[1]), [
              opposite(pair[1]),
              secondTurn
            ])
          ) {
            continue;
          }
          patterns.push(pattern);
        }
      }
    }
    return patterns;
  }

  function midEdgePatterns(clue: CellLoopClue): Pattern[] {
    const geometry = edges.find((edge) => edge.key === clue.edge);
    if (!geometry) return [];
    requiredVertices.add(cellKey(geometry.start));
    requiredVertices.add(cellKey(geometry.end));
    const direction = DELTAS.findIndex(
      (delta) =>
        delta.row === geometry.end.row - geometry.start.row &&
        delta.col === geometry.end.col - geometry.start.col
    ) as Direction;
    const outwardStart = opposite(direction);
    const outwardEnd = direction;
    const middleEdge = edgeIndexes.get(geometry.key)!;
    const patterns: Pattern[] = [];

    for (let length = 0; length <= Math.max(level.rows, level.cols); length += 1) {
      for (const startTurn of turnChoices(outwardStart)) {
        for (const endTurn of turnChoices(outwardEnd)) {
          const pattern = new Map<number, Bit>();
          const valid =
            assignPattern(pattern, middleEdge, 1) &&
            (length === 0
              ? setVertex(pattern, geometry.start, [direction, startTurn]) &&
                setVertex(pattern, geometry.end, [
                  opposite(direction),
                  endTurn
                ])
              : setVertex(pattern, geometry.start, [
                  direction,
                  outwardStart
                ]) &&
                setVertex(pattern, geometry.end, [
                  opposite(direction),
                  outwardEnd
                ]) &&
                walkArm(
                  pattern,
                  geometry.start,
                  outwardStart,
                  length,
                  startTurn
                ) &&
                walkArm(
                  pattern,
                  geometry.end,
                  outwardEnd,
                  length,
                  endTurn
                ));
          if (valid) {
            patterns.push(pattern);
          }
        }
      }
    }
    return patterns;
  }

  function cluePatterns(clue: CellLoopClue): Pattern[] {
    if (level.mode === "masyu") return masyuPatterns(clue);
    if (clue.kind === "mid-edge") return midEdgePatterns(clue);
    requiredVertices.add(`${clue.row}:${clue.col}`);

    const origin = { row: clue.row, col: clue.col };
    const directionPairs: Array<[Direction, Direction]> = [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3]
    ];
    const maximum = Math.max(level.rows, level.cols);
    const patterns: Pattern[] = [];

    for (const pair of directionPairs) {
      const straight = isStraightPair(pair[0], pair[1]);
      const armPairs: Array<[number, number]> = [];
      for (let first = 1; first <= maximum; first += 1) {
        for (let second = 1; second <= maximum; second += 1) {
          if (clue.kind === "mid-cell" && (!straight || first !== second)) {
            continue;
          }
          if (level.mode === "balance-loop") {
            const equal = first === second;
            if (
              (clue.kind === "white" && !equal) ||
              (clue.kind === "black" && equal) ||
              (clue.value !== undefined && first + second !== clue.value)
            ) {
              continue;
            }
          }
          if (level.mode === "geradeweg") {
            if (
              clue.value === undefined ||
              (straight && first + second !== clue.value) ||
              (!straight && (first !== clue.value || second !== clue.value))
            ) {
              continue;
            }
          }
          if (level.mode === "shingoki") {
            if (
              clue.value === undefined ||
              first + second !== clue.value ||
              (clue.kind === "white" && !straight) ||
              (clue.kind === "black" && straight)
            ) {
              continue;
            }
          }
          armPairs.push([first, second]);
        }
      }
      patterns.push(...pathPatterns(origin, pair, armPairs));
    }
    return patterns;
  }

  const clueDomains = level.loopClues.map(cluePatterns);
  const solutionIndexes = new Set(
    level.solutionEdges.map((edge) => edgeIndexes.get(edge)!)
  );
  const state = new Int8Array(edges.length).fill(-1);
  level.prefilledEdges.forEach((edge) => {
    state[edgeIndexes.get(edge)!] = 1;
  });

  let count = 0;
  let nodes = 0;
  let aborted = false;
  let firstSolution: CellLoopLevel["solutionEdges"] | undefined;

  function assign(target: Int8Array, edge: number, value: Bit): boolean {
    if (target[edge] === value) return true;
    if (target[edge] !== -1) return false;
    target[edge] = value;
    return true;
  }

  function closeCompletedLoop(target: Int8Array): boolean {
    const adjacency = new Map<string, string[]>();
    edges.forEach((edge, index) => {
      if (target[index] !== 1) return;
      const start = cellKey(edge.start);
      const end = cellKey(edge.end);
      adjacency.set(start, [...(adjacency.get(start) ?? []), end]);
      adjacency.set(end, [...(adjacency.get(end) ?? []), start]);
    });
    const closedVertices = [...adjacency.entries()]
      .filter(([, neighbors]) => neighbors.length === 2)
      .map(([vertex]) => vertex);
    for (const start of closedVertices) {
      const queue = [start];
      const visited = new Set([start]);
      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        for (const next of adjacency.get(queue[cursor]) ?? []) {
          if (visited.has(next)) continue;
          visited.add(next);
          queue.push(next);
        }
      }
      if (
        [...visited].every((vertex) => adjacency.get(vertex)?.length === 2)
      ) {
        if (
          [...adjacency.keys()].some((vertex) => !visited.has(vertex)) ||
          [...requiredVertices].some((vertex) => !visited.has(vertex))
        ) {
          return false;
        }
        for (let index = 0; index < target.length; index += 1) {
          if (target[index] === -1) target[index] = 0;
        }
        return true;
      }
    }
    return true;
  }

  function propagate(target: Int8Array): boolean {
    let changed = true;
    while (changed) {
      changed = false;
      for (const [vertex, incident] of vertexEdges) {
        const on = incident.filter((edge) => target[edge] === 1).length;
        const unknown = incident.filter((edge) => target[edge] === -1);
        const required = requiredVertices.has(vertex);
        if (
          on > 2 ||
          (on === 1 && unknown.length === 0) ||
          (required && on + unknown.length < 2)
        ) {
          return false;
        }
        if (on === 2 || (!required && on === 0 && unknown.length === 1)) {
          for (const edge of unknown) {
            if (!assign(target, edge, 0)) return false;
            changed = true;
          }
        } else if (
          (on === 1 && unknown.length === 1) ||
          (required && on + unknown.length === 2)
        ) {
          for (const edge of unknown) {
            if (!assign(target, edge, 1)) return false;
            changed = true;
          }
        }
      }

      for (const domain of clueDomains) {
        const possible = domain.filter((pattern) =>
          [...pattern].every(
            ([edge, value]) => target[edge] === -1 || target[edge] === value
          )
        );
        if (possible.length === 0) return false;
        const candidates = new Set(possible.flatMap((pattern) => [...pattern.keys()]));
        for (const edge of candidates) {
          const values = possible.map((pattern) => pattern.get(edge));
          if (values.some((value) => value === undefined)) continue;
          const value = values[0]!;
          if (values.every((candidate) => candidate === value) && target[edge] === -1) {
            if (!assign(target, edge, value)) return false;
            changed = true;
          }
        }
      }

      const unknownBefore = target.filter((value) => value === -1).length;
      if (!closeCompletedLoop(target)) return false;
      if (target.filter((value) => value === -1).length !== unknownBefore) {
        changed = true;
      }
    }
    return true;
  }

  function search(target: Int8Array) {
    if (count >= limit || aborted) return;
    nodes += 1;
    if (nodes > nodeLimit) {
      aborted = true;
      return;
    }
    if (!propagate(target)) return;

    const edge = [...target]
      .map((value, index) => ({ value, index }))
      .filter(({ value }) => value === -1)
      .sort((first, second) => {
        const firstScore =
          clueDomains.filter((domain) =>
            domain.some((pattern) => pattern.has(first.index))
          ).length +
          (solutionIndexes.has(first.index) ? 0.1 : 0);
        const secondScore =
          clueDomains.filter((domain) =>
            domain.some((pattern) => pattern.has(second.index))
          ).length +
          (solutionIndexes.has(second.index) ? 0.1 : 0);
        return secondScore - firstScore;
      })[0]?.index;

    if (edge === undefined) {
      const marks = Object.fromEntries(
        edges
          .filter((_, index) => target[index] === 1)
          .map((item) => [item.key, "line"])
      ) as EdgeMap;
      if (validateCellLoop(level, marks).complete) {
        count += 1;
        firstSolution ??= edges
          .filter((_, index) => target[index] === 1)
          .map((item) => item.key);
      }
      return;
    }

    const preferred = solutionIndexes.has(edge) ? 1 : 0;
    for (const value of [preferred, 1 - preferred] as Bit[]) {
      const next = target.slice();
      next[edge] = value;
      search(next);
      if (count >= limit || aborted) return;
    }
  }

  if (clueDomains.some((domain) => domain.length === 0)) {
    if (process.env.DEBUG_CELL_LOOP_SOLVER === "1") {
      clueDomains.forEach((domain, index) => {
        if (domain.length === 0) {
          console.error(`Level ${level.id} empty clue domain`, level.loopClues[index]);
        }
      });
    }
    return {
      count: 0,
      nodes: 0,
      aborted: false,
      firstSolution: undefined
    };
  }
  search(state);
  return { count, nodes, aborted, firstSolution };
}

if (process.env.RUN_CELL_LOOP_VERIFY === "1") {
  let failed = false;
  const requestedIds = new Set(
    (process.env.CELL_LOOP_LEVEL_IDS ?? "")
      .split(",")
      .filter(Boolean)
      .map(Number)
  );
  const levels =
    requestedIds.size === 0
      ? CELL_LOOP_LEVELS
      : CELL_LOOP_LEVELS.filter((level) => requestedIds.has(level.id));
  for (const level of levels) {
    const result = solveCellLoop(level);
    const status = result.aborted
      ? "aborted"
      : result.count === 1
        ? "unique"
        : `${result.count} solutions`;
    console.log(`Level ${level.id}: ${status}, search nodes ${result.nodes}`);
    if (result.aborted || result.count !== 1) failed = true;
  }

  if (failed) process.exitCode = 1;
}
