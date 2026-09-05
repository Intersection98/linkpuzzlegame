import type { NumberlinkLevel } from "./game";

export type HashiIsland = {
  id: string;
  row: number;
  col: number;
  target: number;
};

export type BridgeKey = `${string}|${string}`;
export type BridgeMap = Record<string, 1 | 2>;

export type HashiBridge = {
  key: BridgeKey;
  from: HashiIsland;
  to: HashiIsland;
  orientation: "h" | "v";
};

export type HashiLevel = Omit<NumberlinkLevel, "mode" | "chapter"> & {
  mode: "hashi";
  chapter: 7;
  islands: HashiIsland[];
  solutionBridges: BridgeMap;
};

export function bridgeKey(first: string, second: string): BridgeKey {
  return [first, second].sort().join("|") as BridgeKey;
}

export function isHashiLevel(level: NumberlinkLevel): level is HashiLevel {
  return level.mode === "hashi" && "islands" in level;
}

export function getHashiBridges(level: HashiLevel): HashiBridge[] {
  const bridges = new Map<BridgeKey, HashiBridge>();

  level.islands.forEach((island) => {
    const horizontal = level.islands
      .filter((candidate) => candidate.row === island.row && candidate.id !== island.id)
      .sort((a, b) => a.col - b.col);
    const vertical = level.islands
      .filter((candidate) => candidate.col === island.col && candidate.id !== island.id)
      .sort((a, b) => a.row - b.row);
    const neighbors = [
      [...horizontal].reverse().find((candidate) => candidate.col < island.col),
      horizontal.find((candidate) => candidate.col > island.col),
      [...vertical].reverse().find((candidate) => candidate.row < island.row),
      vertical.find((candidate) => candidate.row > island.row)
    ].filter((candidate): candidate is HashiIsland => Boolean(candidate));

    neighbors.forEach((neighbor) => {
      const key = bridgeKey(island.id, neighbor.id);
      if (bridges.has(key)) return;
      bridges.set(key, {
        key,
        from: island,
        to: neighbor,
        orientation: island.row === neighbor.row ? "h" : "v"
      });
    });
  });

  return [...bridges.values()];
}

export function islandDegree(
  level: HashiLevel,
  bridges: BridgeMap,
  islandId: string
): number {
  return getHashiBridges(level)
    .filter(
      (bridge) => bridge.from.id === islandId || bridge.to.id === islandId
    )
    .reduce((sum, bridge) => sum + (bridges[bridge.key] ?? 0), 0);
}

export function bridgesCross(first: HashiBridge, second: HashiBridge): boolean {
  if (first.orientation === second.orientation) return false;
  const horizontal = first.orientation === "h" ? first : second;
  const vertical = first.orientation === "v" ? first : second;
  const minCol = Math.min(horizontal.from.col, horizontal.to.col);
  const maxCol = Math.max(horizontal.from.col, horizontal.to.col);
  const minRow = Math.min(vertical.from.row, vertical.to.row);
  const maxRow = Math.max(vertical.from.row, vertical.to.row);
  const horizontalRow = horizontal.from.row;
  const verticalCol = vertical.from.col;
  return (
    verticalCol > minCol &&
    verticalCol < maxCol &&
    horizontalRow > minRow &&
    horizontalRow < maxRow
  );
}

export function findHashiConflict(
  level: HashiLevel,
  bridges: BridgeMap
): string | null {
  const candidates = getHashiBridges(level);
  const active = candidates.filter((bridge) => (bridges[bridge.key] ?? 0) > 0);
  for (let first = 0; first < active.length; first += 1) {
    for (let second = first + 1; second < active.length; second += 1) {
      if (bridgesCross(active[first], active[second])) {
        return "桥梁不能交叉";
      }
    }
  }
  return null;
}

export function getHashiHint(
  level: HashiLevel,
  bridges: BridgeMap
): { key: BridgeKey; count: 0 | 1 | 2 } | null {
  const candidates = getHashiBridges(level);
  const incorrect = candidates.find(
    (bridge) =>
      (bridges[bridge.key] ?? 0) >
      (level.solutionBridges[bridge.key] ?? 0)
  );
  const candidate =
    incorrect ??
    candidates.find(
      (bridge) =>
        (bridges[bridge.key] ?? 0) <
        (level.solutionBridges[bridge.key] ?? 0)
    );
  if (!candidate) return null;
  return {
    key: candidate.key,
    count: level.solutionBridges[candidate.key] ?? 0
  };
}

export function validateHashi(
  level: HashiLevel,
  bridges: BridgeMap
): { complete: boolean; reason?: string } {
  if (findHashiConflict(level, bridges)) {
    return { complete: false, reason: "crossing" };
  }
  if (
    level.islands.some(
      (island) => islandDegree(level, bridges, island.id) !== island.target
    )
  ) {
    return { complete: false, reason: "degree-mismatch" };
  }

  const active = getHashiBridges(level).filter(
    (bridge) => (bridges[bridge.key] ?? 0) > 0
  );
  const neighbors = new Map<string, string[]>();
  active.forEach((bridge) => {
    neighbors.set(bridge.from.id, [
      ...(neighbors.get(bridge.from.id) ?? []),
      bridge.to.id
    ]);
    neighbors.set(bridge.to.id, [
      ...(neighbors.get(bridge.to.id) ?? []),
      bridge.from.id
    ]);
  });
  const start = level.islands[0]?.id;
  if (!start) return { complete: false, reason: "empty" };
  const queue = [start];
  const visited = new Set([start]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    for (const next of neighbors.get(queue[cursor]) ?? []) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push(next);
    }
  }
  if (visited.size !== level.islands.length) {
    return { complete: false, reason: "disconnected" };
  }

  return { complete: true };
}

export function hashiProgress(
  level: HashiLevel,
  bridges: BridgeMap
): { matched: number; total: number; bridgeCount: number } {
  return {
    matched: level.islands.filter(
      (island) => islandDegree(level, bridges, island.id) === island.target
    ).length,
    total: level.islands.length,
    bridgeCount: Object.values(bridges).reduce((sum, count) => sum + count, 0)
  };
}
