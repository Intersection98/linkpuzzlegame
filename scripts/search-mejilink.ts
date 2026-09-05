import { getCellEdges, getSlitherlinkEdges, type EdgeKey } from "../src/slitherlink";
import type { Point } from "../src/game";

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
};

function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pointKey(point: Point): string {
  return `${point.row}:${point.col}`;
}

function regionBoundary(cells: Point[]): EdgeKey[] {
  const members = new Set(cells.map(pointKey));
  const boundary = new Set<EdgeKey>();
  cells.forEach((cell) => {
    const neighbors = [
      { row: cell.row - 1, col: cell.col },
      { row: cell.row, col: cell.col + 1 },
      { row: cell.row + 1, col: cell.col },
      { row: cell.row, col: cell.col - 1 }
    ];
    getCellEdges(cell.row, cell.col).forEach((edge, index) => {
      if (!members.has(pointKey(neighbors[index]))) boundary.add(edge);
    });
  });
  return [...boundary];
}

function randomRegions(rows: number, cols: number, random: () => number): Point[][] {
  const free = new Set(
    Array.from({ length: rows * cols }, (_, index) =>
      `${Math.floor(index / cols)}:${index % cols}`
    )
  );
  const regions: Point[][] = [];

  while (free.size > 0) {
    const startKey = [...free][Math.floor(random() * free.size)];
    const [row, col] = startKey.split(":").map(Number);
    const targetSize = 1 + Math.floor(random() * 4);
    const region = [{ row, col }];
    free.delete(startKey);

    while (region.length < targetSize) {
      const frontier = region.flatMap((cell) =>
        [
          { row: cell.row - 1, col: cell.col },
          { row: cell.row + 1, col: cell.col },
          { row: cell.row, col: cell.col - 1 },
          { row: cell.row, col: cell.col + 1 }
        ].filter((point) => free.has(pointKey(point)))
      );
      if (frontier.length === 0) break;
      const next = frontier[Math.floor(random() * frontier.length)];
      free.delete(pointKey(next));
      region.push(next);
    }
    regions.push(region);
  }

  return regions;
}

export function solveMejilink(
  rows: number,
  cols: number,
  regions: Point[][],
  playableEdges?: EdgeKey[],
  limit = 2,
  nodeLimit = 500_000
) {
  const allowedEdges = new Set(
    playableEdges ?? regions.flatMap(regionBoundary)
  );
  const edges = getSlitherlinkEdges(rows, cols).filter((edge) =>
    allowedEdges.has(edge.key)
  );
  const edgeIndexes = new Map(edges.map((edge, index) => [edge.key, index]));
  const vertexEdges = new Map<string, number[]>();
  edges.forEach((edge, index) => {
    edge.vertices.forEach(([row, col]) => {
      const key = `${row}:${col}`;
      vertexEdges.set(key, [...(vertexEdges.get(key) ?? []), index]);
    });
  });
  const constraints = regions.map((cells) => {
    const boundary = regionBoundary(cells)
      .map((edge) => edgeIndexes.get(edge))
      .filter((edge): edge is number => edge !== undefined);
    return { edges: boundary, target: boundary.length - cells.length };
  });
  if (constraints.some(({ target, edges }) => target < 0 || target > edges.length)) {
    return { count: 0, nodes: 0, aborted: false, solution: null, edges };
  }

  let count = 0;
  let nodes = 0;
  let aborted = false;
  let solution: Int8Array | null = null;

  const assign = (state: Int8Array, edge: number, value: 0 | 1) => {
    if (state[edge] === value) return true;
    if (state[edge] !== -1) return false;
    state[edge] = value;
    return true;
  };

  const closeLoop = (state: Int8Array): boolean => {
    const parent = Array.from(
      { length: (rows + 1) * (cols + 1) },
      (_, index) => index
    );
    const vertex = ([row, col]: [number, number]) => row * (cols + 1) + col;
    const find = (value: number): number => {
      while (parent[value] !== value) {
        parent[value] = parent[parent[value]];
        value = parent[value];
      }
      return value;
    };
    let cycle = -1;
    for (let index = 0; index < edges.length; index += 1) {
      if (state[index] !== 1) continue;
      const [a, b] = edges[index].vertices.map(vertex);
      const rootA = find(a);
      const rootB = find(b);
      if (rootA === rootB) cycle = rootA;
      else parent[rootB] = rootA;
    }
    if (cycle < 0) return true;
    const root = find(cycle);
    if (
      edges.some(
        (edge, index) =>
          state[index] === 1 && find(vertex(edge.vertices[0])) !== root
      )
    ) {
      return false;
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
      for (const constraint of constraints) {
        const on = constraint.edges.filter((edge) => state[edge] === 1).length;
        const unknown = constraint.edges.filter((edge) => state[edge] === -1);
        if (on > constraint.target || on + unknown.length < constraint.target) {
          return false;
        }
        if (on === constraint.target || on + unknown.length === constraint.target) {
          const value = on === constraint.target ? 0 : 1;
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
      if (!closeLoop(state)) return false;
      if (state.filter((value) => value === -1).length !== before) changed = true;
    }
    return true;
  };

  const search = (state: Int8Array) => {
    if (count >= limit || aborted) return;
    nodes += 1;
    if (nodes > nodeLimit) {
      aborted = true;
      return;
    }
    if (!propagate(state)) return;
    const edge = state.findIndex((value) => value === -1);
    if (edge < 0) {
      const selected = edges.filter((_, index) => state[index] === 1);
      if (selected.length === 0) return;
      const degrees = new Map<string, number>();
      selected.forEach((item) =>
        item.vertices.forEach(([row, col]) => {
          const key = `${row}:${col}`;
          degrees.set(key, (degrees.get(key) ?? 0) + 1);
        })
      );
      if ([...degrees.values()].every((degree) => degree === 2)) {
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
  };

  search(new Int8Array(edges.length).fill(-1));
  return { count, nodes, aborted, solution, edges };
}

if (process.env.RUN_MEJILINK_SEARCH === "1") {
  const size = Number(process.argv[2] ?? 5);
  const attempts = Number(process.argv[3] ?? 500);
  const random = randomSource(Number(process.argv[4] ?? 20260904));
  const best: Array<
    ReturnType<typeof solveMejilink> & {
      allRegions: Point[][];
      clueRegions: Point[][];
      playableEdges: EdgeKey[];
    }
  > = [];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const allRegions = randomRegions(size, size, random);
    const playable = new Set(allRegions.flatMap(regionBoundary));
    const clueRegions = allRegions.filter((region) => {
      const outerEdges = regionBoundary(region).filter((edge) => {
        const [orientation, rowValue, colValue] = edge.split(":");
        const row = Number(rowValue);
        const col = Number(colValue);
        return (
          (orientation === "h" && (row === 0 || row === size)) ||
          (orientation === "v" && (col === 0 || col === size))
        );
      });
      if (outerEdges.length === 0 || random() >= 0.45) return true;
      playable.delete(
        outerEdges[Math.floor(random() * outerEdges.length)]
      );
      return false;
    });
    if (clueRegions.length < Math.max(3, allRegions.length / 2)) continue;
    const playableEdges = [...playable];
    const result = solveMejilink(
      size,
      size,
      clueRegions,
      playableEdges
    );
    if (result.aborted || result.count !== 1 || !result.solution) continue;
    best.push({
      ...result,
      allRegions,
      clueRegions,
      playableEdges
    });
    best.sort((a, b) => b.nodes - a.nodes);
    best.length = Math.min(best.length, 5);
  }

  best.forEach((entry) => {
    const regionGrid = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => "")
    );
    entry.allRegions.forEach((region, index) => {
      region.forEach((cell) => {
        regionGrid[cell.row][cell.col] = index.toString(36);
      });
    });
    console.log(
      JSON.stringify({
        size,
        nodes: entry.nodes,
        regionGrid: regionGrid.map((row) => row.join(",")),
        playableEdges: entry.playableEdges.join(" "),
        clueRegionIds: entry.clueRegions.map((region) =>
          entry.allRegions.indexOf(region).toString(36)
        ),
        solutionEdges: entry.edges
          .filter((_, index) => entry.solution?.[index] === 1)
          .map((edge) => edge.key)
          .join(" ")
      })
    );
  });
}
