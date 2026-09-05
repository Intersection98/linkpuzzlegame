import {
  bridgesCross,
  getHashiBridges,
  validateHashi,
  type BridgeMap,
  type HashiBridge,
  type HashiIsland,
  type HashiLevel
} from "../src/hashi";

declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
};

type Domain = Array<0 | 1 | 2>;

function randomSource(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [
      shuffled[target],
      shuffled[index]
    ];
  }
  return shuffled;
}

function makeLevel(
  size: number,
  points: Array<{ row: number; col: number }>,
  solutionBridges: BridgeMap
): HashiLevel {
  const islands: HashiIsland[] = points.map((point, index) => ({
    id: String.fromCharCode(65 + index),
    ...point,
    target: 0
  }));
  const level: HashiLevel = {
    id: 0,
    chapter: 7,
    chapterTitle: "数桥",
    mode: "hashi",
    title: "generated",
    difficulty: "generated",
    rows: size,
    cols: size,
    colors: [],
    endpoints: {},
    solution: {},
    islands,
    solutionBridges
  };
  getHashiBridges(level).forEach((bridge) => {
    const count = solutionBridges[bridge.key] ?? 0;
    bridge.from.target += count;
    bridge.to.target += count;
  });
  return level;
}

function graphConnected(
  islands: HashiIsland[],
  bridges: HashiBridge[],
  canUse: (bridge: HashiBridge) => boolean
): boolean {
  const start = islands[0]?.id;
  if (!start) return false;
  const visited = new Set([start]);
  const queue = [start];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    bridges.forEach((bridge) => {
      if (!canUse(bridge)) return;
      const next =
        bridge.from.id === queue[cursor]
          ? bridge.to.id
          : bridge.to.id === queue[cursor]
            ? bridge.from.id
            : null;
      if (!next || visited.has(next)) return;
      visited.add(next);
      queue.push(next);
    });
  }
  return visited.size === islands.length;
}

export function solveHashi(
  level: HashiLevel,
  limit = 2,
  nodeLimit = 2_000_000
) {
  const bridges = getHashiBridges(level);
  const incident = new Map<string, number[]>();
  level.islands.forEach((island) => incident.set(island.id, []));
  bridges.forEach((bridge, index) => {
    incident.get(bridge.from.id)?.push(index);
    incident.get(bridge.to.id)?.push(index);
  });
  const crossingPairs: Array<[number, number]> = [];
  for (let first = 0; first < bridges.length; first += 1) {
    for (let second = first + 1; second < bridges.length; second += 1) {
      if (bridgesCross(bridges[first], bridges[second])) {
        crossingPairs.push([first, second]);
      }
    }
  }

  let count = 0;
  let nodes = 0;
  let aborted = false;
  let solution: BridgeMap | null = null;

  function propagate(domains: Domain[]): boolean {
    let changed = true;
    while (changed) {
      changed = false;
      for (const island of level.islands) {
        const indices = incident.get(island.id) ?? [];
        const minimums = indices.map((index) => Math.min(...domains[index]));
        const maximums = indices.map((index) => Math.max(...domains[index]));
        const minimum = minimums.reduce((sum, value) => sum + value, 0);
        const maximum = maximums.reduce((sum, value) => sum + value, 0);
        if (island.target < minimum || island.target > maximum) return false;
        indices.forEach((bridgeIndex, localIndex) => {
          const domain = domains[bridgeIndex];
          if (domain.length === 1) return;
          const otherMinimum = minimum - minimums[localIndex];
          const otherMaximum = maximum - maximums[localIndex];
          const filtered = domain.filter(
            (value) =>
              value + otherMinimum <= island.target &&
              value + otherMaximum >= island.target
          );
          if (filtered.length !== domain.length) {
            domains[bridgeIndex] = filtered;
            changed = true;
          }
        });
        if (domains.some((domain) => domain.length === 0)) return false;
      }

      for (const [first, second] of crossingPairs) {
        const firstActive = !domains[first].includes(0);
        const secondActive = !domains[second].includes(0);
        if (firstActive && secondActive) return false;
        if (firstActive && domains[second].length > 1) {
          domains[second] = [0];
          changed = true;
        }
        if (secondActive && domains[first].length > 1) {
          domains[first] = [0];
          changed = true;
        }
      }
    }

    return graphConnected(
      level.islands,
      bridges,
      (bridge) => domains[bridges.indexOf(bridge)].some((value) => value > 0)
    );
  }

  function search(domains: Domain[]) {
    if (count >= limit || aborted) return;
    nodes += 1;
    if (nodes > nodeLimit) {
      aborted = true;
      return;
    }
    if (!propagate(domains)) return;
    const target = domains
      .map((domain, index) => ({ domain, index }))
      .filter(({ domain }) => domain.length > 1)
      .sort((first, second) => first.domain.length - second.domain.length)[0];
    if (!target) {
      const candidate = Object.fromEntries(
        domains.flatMap((domain, index) =>
          domain[0] > 0 ? [[bridges[index].key, domain[0]]] : []
        )
      ) as BridgeMap;
      if (validateHashi(level, candidate).complete) {
        count += 1;
        solution ??= candidate;
      }
      return;
    }
    for (const value of target.domain) {
      const next = domains.map((domain) => [...domain] as Domain);
      next[target.index] = [value];
      search(next);
      if (count >= limit || aborted) return;
    }
  }

  search(bridges.map(() => [0, 1, 2]));
  return { count, nodes, aborted, solution };
}

function randomPoints(
  size: number,
  islandCount: number,
  random: () => number
): Array<{ row: number; col: number }> {
  const cells = Array.from({ length: size * size }, (_, index) => ({
    row: Math.floor(index / size),
    col: index % size
  }));
  return shuffle(cells, random)
    .slice(0, islandCount)
    .sort((first, second) => first.row - second.row || first.col - second.col);
}

function makeSolution(
  level: HashiLevel,
  random: () => number,
  treeDoubleChance: number,
  extraEdgeChance: number,
  extraDoubleChance: number
): BridgeMap | null {
  const bridges = getHashiBridges(level);
  if (!graphConnected(level.islands, bridges, () => true)) return null;

  for (let treeAttempt = 0; treeAttempt < 30; treeAttempt += 1) {
    const parent = new Map(level.islands.map((island) => [island.id, island.id]));
    const find = (id: string): string => {
      const root = parent.get(id)!;
      if (root === id) return root;
      const resolved = find(root);
      parent.set(id, resolved);
      return resolved;
    };
    const solution: BridgeMap = {};
    const active: HashiBridge[] = [];
    for (const bridge of shuffle(bridges, random)) {
      const firstRoot = find(bridge.from.id);
      const secondRoot = find(bridge.to.id);
      if (firstRoot === secondRoot) continue;
      if (active.some((candidate) => bridgesCross(candidate, bridge))) continue;
      solution[bridge.key] = random() < treeDoubleChance ? 2 : 1;
      active.push(bridge);
      parent.set(firstRoot, secondRoot);
    }
    if (
      new Set(level.islands.map((island) => find(island.id))).size !== 1
    ) {
      continue;
    }

    shuffle(bridges, random).forEach((bridge) => {
      if (solution[bridge.key] || random() > extraEdgeChance) return;
      if (active.some((candidate) => bridgesCross(candidate, bridge))) return;
      solution[bridge.key] = random() < extraDoubleChance ? 2 : 1;
      active.push(bridge);
    });
    return solution;
  }
  return null;
}

if (process.env.RUN_HASHI_SEARCH === "1") {
  const size = Number(process.argv[2] ?? 5);
  const islandCount = Number(process.argv[3] ?? 9);
  const attempts = Number(process.argv[4] ?? 5000);
  const random = randomSource(Number(process.argv[5] ?? 20260905));
  const treeDoubleChance = Number(process.argv[6] ?? 0.35);
  const extraEdgeChance = Number(process.argv[7] ?? 0.28);
  const extraDoubleChance = Number(process.argv[8] ?? 0.25);
  const minimumCrossings = Number(process.argv[9] ?? 0);
  const results: Array<{
    nodes: number;
    islands: HashiIsland[];
    solutionBridges: BridgeMap;
    candidates: number;
    crossings: number;
  }> = [];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const points = randomPoints(size, islandCount, random);
    if (
      Math.min(...points.map((point) => point.row)) !== 0 ||
      Math.max(...points.map((point) => point.row)) !== size - 1 ||
      Math.min(...points.map((point) => point.col)) !== 0 ||
      Math.max(...points.map((point) => point.col)) !== size - 1
    ) {
      continue;
    }
    const emptyLevel = makeLevel(size, points, {});
    const solutionBridges = makeSolution(
      emptyLevel,
      random,
      treeDoubleChance,
      extraEdgeChance,
      extraDoubleChance
    );
    if (!solutionBridges) continue;
    const level = makeLevel(size, points, solutionBridges);
    if (level.islands.some((island) => island.target === 0)) continue;
    const bridges = getHashiBridges(level);
    const crossings = bridges.reduce(
      (sum, bridge, index) =>
        sum +
        bridges
          .slice(index + 1)
          .filter((candidate) => bridgesCross(bridge, candidate)).length,
      0
    );
    if (crossings < minimumCrossings) continue;
    const result = solveHashi(level);
    if (result.aborted || result.count !== 1) continue;
    results.push({
      nodes: result.nodes,
      islands: level.islands,
      solutionBridges,
      candidates: bridges.length,
      crossings
    });
    results.sort((first, second) => second.nodes - first.nodes);
    results.length = Math.min(results.length, 12);
  }

  results.forEach((result) => console.log(JSON.stringify(result)));
}
