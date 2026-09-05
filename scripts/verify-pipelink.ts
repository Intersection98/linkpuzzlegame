import {
  cellKey,
  getCellLoopEdges,
  validateCellLoop,
  type CellLoopLevel,
  type PipeDirection
} from "../src/cellLoop";
import { PIPELINK_LEVELS } from "../src/cellLoopLevels";
import type { EdgeMap } from "../src/slitherlink";

declare const process: {
  env: Record<string, string | undefined>;
  exitCode?: number;
};

type Bit = 0 | 1;

const PATTERNS: PipeDirection[][] = [
  ["up", "right"],
  ["up", "down"],
  ["up", "left"],
  ["right", "down"],
  ["right", "left"],
  ["down", "left"],
  ["up", "right", "down", "left"]
];

function opposite(direction: PipeDirection): PipeDirection {
  if (direction === "up") return "down";
  if (direction === "right") return "left";
  if (direction === "down") return "up";
  return "right";
}

export function solvePipelink(
  level: CellLoopLevel,
  limit = 2,
  nodeLimit = 2_000_000
) {
  if (level.mode !== "pipelink") {
    throw new Error("solvePipelink requires a Pipelink level");
  }

  const edges = getCellLoopEdges(level.rows, level.cols, level.blockedCells);
  const edgeIndexes = new Map(edges.map((edge, index) => [edge.key, index]));
  const blocked = new Set(level.blockedCells.map(cellKey));
  const directionalEdges = new Map<
    string,
    Partial<Record<PipeDirection, number>>
  >();

  edges.forEach((edge, index) => {
    const direction: PipeDirection =
      edge.start.row === edge.end.row ? "right" : "down";
    const startKey = cellKey(edge.start);
    const endKey = cellKey(edge.end);
    directionalEdges.set(startKey, {
      ...(directionalEdges.get(startKey) ?? {}),
      [direction]: index
    });
    directionalEdges.set(endKey, {
      ...(directionalEdges.get(endKey) ?? {}),
      [opposite(direction)]: index
    });
  });

  const clueByCell = new Map(
    (level.pipeClues ?? []).map((clue) => [cellKey(clue), clue])
  );
  const cellDomains = new Map<
    string,
    Array<{ directions: PipeDirection[]; edges: Set<number> }>
  >();

  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      const point = { row, col };
      const key = cellKey(point);
      if (blocked.has(key)) continue;
      const directional = directionalEdges.get(key) ?? {};
      const clue = clueByCell.get(key);
      const patterns = clue ? [clue.directions] : PATTERNS;
      const valid = patterns.flatMap((directions) => {
        if (
          directions.some(
            (direction) => directional[direction] === undefined
          )
        ) {
          return [];
        }
        return [
          {
            directions,
            edges: new Set(
              directions.map((direction) => directional[direction]!)
            )
          }
        ];
      });
      cellDomains.set(key, valid);
    }
  }

  const initial = new Int8Array(edges.length).fill(-1);
  level.prefilledEdges.forEach((edge) => {
    const index = edgeIndexes.get(edge);
    if (index !== undefined) initial[index] = 1;
  });

  let count = 0;
  let nodes = 0;
  let aborted = false;
  let solution: Int8Array | null = null;

  function assign(state: Int8Array, edge: number, value: Bit): boolean {
    if (state[edge] === value) return true;
    if (state[edge] !== -1) return false;
    state[edge] = value;
    return true;
  }

  function possiblePatterns(state: Int8Array, key: string) {
    const incident = Object.values(directionalEdges.get(key) ?? {});
    return (cellDomains.get(key) ?? []).filter((pattern) =>
      incident.every((edge) => {
        const value = state[edge];
        return (
          value === -1 ||
          (value === 1) === pattern.edges.has(edge)
        );
      })
    );
  }

  function closeFinishedRoute(state: Int8Array): boolean {
    const links = new Map<number, number[]>();
    const addLink = (first: number, second: number) => {
      links.set(first, [...(links.get(first) ?? []), second]);
      links.set(second, [...(links.get(second) ?? []), first]);
    };

    for (const [key, directional] of directionalEdges) {
      const possible = possiblePatterns(state, key);
      if (possible.length === 0) return false;
      const selected = Object.entries(directional)
        .filter(([, edge]) => state[edge!] === 1)
        .map(([direction, edge]) => ({
          direction: direction as PipeDirection,
          edge: edge!
        }));
      if (selected.length === 2) {
        const [first, second] = selected;
        if (
          possible.every(
            (pattern) =>
              pattern.directions.length === 2 &&
              pattern.edges.has(first.edge) &&
              pattern.edges.has(second.edge)
          )
        ) {
          addLink(first.edge, second.edge);
        }
      } else if (
        selected.length === 4 &&
        possible.every((pattern) => pattern.directions.length === 4)
      ) {
        const edgeFor = (direction: PipeDirection) =>
          directional[direction]!;
        addLink(edgeFor("up"), edgeFor("down"));
        addLink(edgeFor("left"), edgeFor("right"));
      }
    }

    const closedStart = [...links].find(([, neighbors]) => neighbors.length === 2)?.[0];
    if (closedStart === undefined) return true;
    const queue = [closedStart];
    const visited = new Set([closedStart]);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      for (const next of links.get(queue[cursor]) ?? []) {
        if (visited.has(next)) continue;
        visited.add(next);
        queue.push(next);
      }
    }
    if (
      [...visited].some((edge) => (links.get(edge)?.length ?? 0) !== 2)
    ) {
      return true;
    }

    const selectedEdges = [...state]
      .map((value, index) => ({ value, index }))
      .filter(({ value }) => value === 1)
      .map(({ index }) => index);
    if (selectedEdges.some((edge) => !visited.has(edge))) return false;

    for (const [key] of cellDomains) {
      const incident = Object.values(directionalEdges.get(key) ?? {});
      if (!incident.some((edge) => visited.has(edge))) return false;
    }
    for (let edge = 0; edge < state.length; edge += 1) {
      if (state[edge] === -1) state[edge] = 0;
    }
    return true;
  }

  function propagate(state: Int8Array): boolean {
    let changed = true;
    while (changed) {
      changed = false;
      for (const key of cellDomains.keys()) {
        const possible = possiblePatterns(state, key);
        if (possible.length === 0) return false;
        const incident = Object.values(directionalEdges.get(key) ?? {});
        for (const edge of incident) {
          const values = possible.map((pattern) =>
            pattern.edges.has(edge) ? 1 : 0
          );
          if (
            values.every((value) => value === values[0]) &&
            state[edge] === -1
          ) {
            if (!assign(state, edge, values[0] as Bit)) return false;
            changed = true;
          }
        }
      }
      const before = state.filter((value) => value === -1).length;
      if (!closeFinishedRoute(state)) return false;
      if (state.filter((value) => value === -1).length !== before) {
        changed = true;
      }
    }
    return true;
  }

  function search(state: Int8Array) {
    if (count >= limit || aborted) return;
    nodes += 1;
    if (nodes > nodeLimit) {
      aborted = true;
      return;
    }
    if (!propagate(state)) return;

    const edge = [...state].findIndex((value) => value === -1);
    if (edge < 0) {
      const marks = Object.fromEntries(
        edges
          .filter((_, index) => state[index] === 1)
          .map((item) => [item.key, "line"])
      ) as EdgeMap;
      if (validateCellLoop(level, marks).complete) {
        count += 1;
        solution ??= state.slice();
      }
      return;
    }

    for (const value of [1, 0] as const) {
      const next = state.slice();
      next[edge] = value;
      search(next);
      if (count >= limit || aborted) return;
    }
  }

  search(initial);
  return { count, nodes, aborted, solution, edges };
}

if (process.env.RUN_PIPELINK_VERIFY === "1") {
  let failed = false;
  for (const level of PIPELINK_LEVELS) {
    const result = solvePipelink(level);
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
