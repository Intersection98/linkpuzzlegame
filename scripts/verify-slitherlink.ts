import { SLITHERLINK_LEVELS } from "../src/slitherlinkLevels";
import {
  getCellEdges,
  getSlitherlinkEdges,
  validateSlitherlink,
  type EdgeMap,
  type SlitherlinkLevel
} from "../src/slitherlink";

export function countSolutions(
  level: SlitherlinkLevel,
  solutionLimit = 2,
  nodeLimit = 2_000_000
): { count: number; nodes: number; aborted: boolean } {
  const edges = getSlitherlinkEdges(level.rows, level.cols);
  const edgeIndexes = new Map(edges.map((edge, index) => [edge.key, index]));
  const vertexEdges = new Map<string, number[]>();
  edges.forEach((edge, index) => {
    edge.vertices.forEach(([row, col]) => {
      const key = `${row}:${col}`;
      vertexEdges.set(key, [...(vertexEdges.get(key) ?? []), index]);
    });
  });
  const clueEdges = level.clues.flatMap((row, rowIndex) =>
    row.flatMap((clue, colIndex) =>
      clue === null
        ? []
        : [{
            clue,
            edges: getCellEdges(rowIndex, colIndex).map(
              (edge) => edgeIndexes.get(edge)!
            )
          }]
    )
  );

  let count = 0;
  let nodes = 0;
  let aborted = false;

  const assign = (state: Int8Array, edge: number, value: 0 | 1) => {
    if (state[edge] === value) return true;
    if (state[edge] !== -1) return false;
    state[edge] = value;
    return true;
  };

  const closeCompletedLoop = (state: Int8Array): boolean => {
    const parent = Array.from(
      { length: (level.rows + 1) * (level.cols + 1) },
      (_, index) => index
    );
    const vertexIndex = ([row, col]: [number, number]) =>
      row * (level.cols + 1) + col;
    const find = (value: number): number => {
      while (parent[value] !== value) {
        parent[value] = parent[parent[value]];
        value = parent[value];
      }
      return value;
    };
    let cycleRoot = -1;

    for (let index = 0; index < edges.length; index += 1) {
      if (state[index] !== 1) continue;
      const [start, end] = edges[index].vertices.map(vertexIndex);
      const rootA = find(start);
      const rootB = find(end);
      if (rootA === rootB) {
        if (cycleRoot >= 0 && cycleRoot !== rootA) return false;
        cycleRoot = rootA;
      } else {
        parent[rootB] = rootA;
      }
    }

    if (cycleRoot < 0) return true;
    const root = find(cycleRoot);
    for (let index = 0; index < edges.length; index += 1) {
      if (state[index] !== 1) continue;
      if (find(vertexIndex(edges[index].vertices[0])) !== root) return false;
    }
    for (let index = 0; index < state.length; index += 1) {
      if (state[index] === -1) state[index] = 0;
    }
    return true;
  };

  const propagate = (state: Int8Array): boolean => {
    let changed = true;
    while (changed) {
      changed = false;

      for (const constraint of clueEdges) {
        const on = constraint.edges.filter((edge) => state[edge] === 1).length;
        const unknown = constraint.edges.filter((edge) => state[edge] === -1);
        if (on > constraint.clue || on + unknown.length < constraint.clue) {
          return false;
        }
        if (on === constraint.clue || on + unknown.length === constraint.clue) {
          const value = on === constraint.clue ? 0 : 1;
          for (const edge of unknown) {
            if (!assign(state, edge, value)) return false;
            changed = true;
          }
        }
      }

      for (const incident of vertexEdges.values()) {
        const on = incident.filter((edge) => state[edge] === 1).length;
        const unknown = incident.filter((edge) => state[edge] === -1);
        if (on > 2 || (on === 1 && unknown.length === 0)) return false;

        if (on === 2 || (on === 0 && unknown.length === 1)) {
          for (const edge of unknown) {
            if (!assign(state, edge, 0)) return false;
            changed = true;
          }
        } else if (on === 1 && unknown.length === 1) {
          if (!assign(state, unknown[0], 1)) return false;
          changed = true;
        }
      }

      const before = state.filter((value) => value === -1).length;
      if (!closeCompletedLoop(state)) return false;
      if (state.filter((value) => value === -1).length !== before) changed = true;
    }
    return true;
  };

  const search = (state: Int8Array) => {
    if (count >= solutionLimit || aborted) return;
    nodes += 1;
    if (nodes > nodeLimit) {
      aborted = true;
      return;
    }
    if (!propagate(state)) return;

    const edge = state.findIndex((value) => value === -1);
    if (edge < 0) {
      const marks = Object.fromEntries(
        edges
          .map((item, index) => [item.key, state[index] === 1 ? "line" : "cross"])
      ) as EdgeMap;
      if (validateSlitherlink(level, marks).complete) count += 1;
      return;
    }

    for (const value of [1, 0] as const) {
      const next = state.slice();
      next[edge] = value;
      search(next);
      if (count >= solutionLimit || aborted) return;
    }
  };

  search(new Int8Array(edges.length).fill(-1));
  return { count, nodes, aborted };
}

function verifyLevels() {
  for (const level of SLITHERLINK_LEVELS) {
    const result = countSolutions(level);
    if (result.aborted || result.count !== 1) {
      throw new Error(
        `Level ${level.id} failed uniqueness: solutions=${result.count}, aborted=${result.aborted}`
      );
    }
    const minimumNodes = level.id === 27 ? 2_000 : level.id === 28 ? 2_400 : 0;
    if (result.nodes < minimumNodes) {
      throw new Error(
        `Level ${level.id} is below its difficulty floor: ${result.nodes} < ${minimumNodes}`
      );
    }
    console.log(`Level ${level.id}: unique, search nodes ${result.nodes}`);
  }
}

if (process.env.npm_lifecycle_event === "verify:levels") {
  verifyLevels();
}
