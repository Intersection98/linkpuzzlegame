export type Point = {
  row: number;
  col: number;
};

export type PathMap = Record<string, Point[]>;

export type EndpointShape =
  | "circle"
  | "diamond"
  | "square"
  | "triangle"
  | "cross"
  | "hex";

export type FlowColor = {
  id: string;
  name: string;
  value: string;
  soft: string;
  shape: EndpointShape;
};

export type PuzzleMode =
  | "numberlink"
  | "number-end"
  | "slitherlink"
  | "mejilink"
  | "pipelink"
  | "thermometers"
  | "hashi"
  | "masyu"
  | "midloop"
  | "balance-loop"
  | "geradeweg"
  | "shingoki";

export type NumberlinkLevel = {
  id: number;
  chapter: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  chapterTitle: string;
  mode: PuzzleMode;
  title: string;
  difficulty: string;
  rows: number;
  cols: number;
  colors: FlowColor[];
  endpoints: Record<string, [Point, Point]>;
  targetLengths?: Record<string, number>;
  solution: PathMap;
  clues?: Array<Array<number | null>>;
  solutionEdges?: string[];
};

export const FLOW_COLORS: FlowColor[] = [
  {
    id: "coral",
    name: "珊瑚",
    value: "#df5f50",
    soft: "#f6d7d1",
    shape: "circle"
  },
  {
    id: "teal",
    name: "青绿",
    value: "#147d76",
    soft: "#cde6e1",
    shape: "diamond"
  },
  {
    id: "gold",
    name: "金黄",
    value: "#c58d1b",
    soft: "#f2dfae",
    shape: "square"
  },
  {
    id: "blue",
    name: "湖蓝",
    value: "#4672b8",
    soft: "#d5e0f1",
    shape: "triangle"
  },
  {
    id: "berry",
    name: "莓红",
    value: "#a64e77",
    soft: "#ead2de",
    shape: "cross"
  },
  {
    id: "leaf",
    name: "叶绿",
    value: "#548a4d",
    soft: "#d9e7d4",
    shape: "hex"
  }
];

export function pointKey(point: Point): string {
  return `${point.row}:${point.col}`;
}

export function samePoint(a: Point, b: Point): boolean {
  return a.row === b.row && a.col === b.col;
}

export function isAdjacent(a: Point, b: Point): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export function clonePaths(paths: PathMap): PathMap {
  return Object.fromEntries(
    Object.entries(paths).map(([color, path]) => [
      color,
      path.map((point) => ({ ...point }))
    ])
  );
}

export function cellOwners(paths: PathMap): Map<string, string> {
  const owners = new Map<string, string>();

  Object.entries(paths).forEach(([color, path]) => {
    path.forEach((point) => owners.set(pointKey(point), color));
  });

  return owners;
}

export function isEndpoint(
  level: NumberlinkLevel,
  color: string,
  point: Point
): boolean {
  return level.endpoints[color].some((endpoint) => samePoint(endpoint, point));
}

export function endpointColorAt(
  level: NumberlinkLevel,
  point: Point
): string | undefined {
  return level.colors.find((color) =>
    level.endpoints[color.id].some((endpoint) => samePoint(endpoint, point))
  )?.id;
}

export function pathConnectsEndpoints(
  level: NumberlinkLevel,
  color: string,
  path: Point[]
): boolean {
  if (path.length < 2) return false;
  const [firstEndpoint, secondEndpoint] = level.endpoints[color];
  const start = path[0];
  const end = path[path.length - 1];

  return (
    (samePoint(start, firstEndpoint) && samePoint(end, secondEndpoint)) ||
    (samePoint(start, secondEndpoint) && samePoint(end, firstEndpoint))
  );
}

export function pathMeetsTargetLength(
  level: NumberlinkLevel,
  color: string,
  path: Point[]
): boolean {
  const targetLength = level.targetLengths?.[color];
  return targetLength === undefined || path.length === targetLength;
}

export function pathIsComplete(
  level: NumberlinkLevel,
  color: string,
  path: Point[]
): boolean {
  return (
    pathConnectsEndpoints(level, color, path) &&
    pathMeetsTargetLength(level, color, path)
  );
}

export function validateBoard(
  level: NumberlinkLevel,
  paths: PathMap
): { complete: boolean; reason?: string } {
  const occupied = new Set<string>();

  for (const color of level.colors) {
    const path = paths[color.id] ?? [];

    if (!pathConnectsEndpoints(level, color.id, path)) {
      return { complete: false, reason: "open-path" };
    }

    if (!pathMeetsTargetLength(level, color.id, path)) {
      return { complete: false, reason: "wrong-length" };
    }

    for (let index = 0; index < path.length; index += 1) {
      const point = path[index];
      const key = pointKey(point);

      if (
        point.row < 0 ||
        point.row >= level.rows ||
        point.col < 0 ||
        point.col >= level.cols
      ) {
        return { complete: false, reason: "out-of-bounds" };
      }

      if (occupied.has(key)) {
        return { complete: false, reason: "overlap" };
      }

      if (index > 0 && !isAdjacent(path[index - 1], point)) {
        return { complete: false, reason: "disconnected" };
      }

      occupied.add(key);
    }
  }

  if (occupied.size !== level.rows * level.cols) {
    return { complete: false, reason: "empty-cells" };
  }

  return { complete: true };
}

export function completedColorCount(
  level: NumberlinkLevel,
  paths: PathMap
): number {
  return level.colors.filter((color) =>
    pathIsComplete(level, color.id, paths[color.id] ?? [])
  ).length;
}
