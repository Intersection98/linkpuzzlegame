import { readFileSync } from "node:fs";

const directions = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1]
];

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function buildGrid(rows, cols) {
  const edges = [];
  const incident = Array.from({ length: rows * cols }, () => []);

  const index = (row, col) => row * cols + col;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (col + 1 < cols) {
        const edge = [index(row, col), index(row, col + 1)];
        incident[edge[0]].push(edges.length);
        incident[edge[1]].push(edges.length);
        edges.push(edge);
      }
      if (row + 1 < rows) {
        const edge = [index(row, col), index(row + 1, col)];
        incident[edge[0]].push(edges.length);
        incident[edge[1]].push(edges.length);
        edges.push(edge);
      }
    }
  }

  return { edges, incident };
}

export function solveNumberlink(
  rows,
  cols,
  pairs,
  solutionLimit = 2,
  nodeLimit = 1_000_000,
  targetLengths = null
) {
  const { edges, incident } = buildGrid(rows, cols);
  const terminals = new Int16Array(rows * cols).fill(-1);
  pairs.forEach(([start, end], color) => {
    terminals[start] = color;
    terminals[end] = color;
  });

  let nodes = 0;
  let aborted = false;
  const solutions = [];

  const setEdge = (state, edge, value) => {
    if (state[edge] === value) return true;
    if (state[edge] !== -1) return false;
    state[edge] = value;
    return true;
  };

  const inspect = (state) => {
    const degree = new Uint8Array(rows * cols);
    const unknown = Array.from({ length: rows * cols }, () => []);

    edges.forEach(([a, b], edge) => {
      if (state[edge] === 1) {
        degree[a] += 1;
        degree[b] += 1;
      } else if (state[edge] === -1) {
        unknown[a].push(edge);
        unknown[b].push(edge);
      }
    });

    return { degree, unknown };
  };

  const componentsArePossible = (state, final = false) => {
    const parent = Array.from({ length: rows * cols }, (_, index) => index);
    const find = (value) => {
      let root = value;
      while (parent[root] !== root) root = parent[root];
      while (parent[value] !== value) {
        const next = parent[value];
        parent[value] = root;
        value = next;
      }
      return root;
    };
    const sizes = new Uint16Array(rows * cols).fill(1);
    const union = (a, b) => {
      const rootA = find(a);
      const rootB = find(b);
      if (rootA === rootB) return false;
      parent[rootB] = rootA;
      sizes[rootA] += sizes[rootB];
      return true;
    };

    for (let edge = 0; edge < edges.length; edge += 1) {
      if (state[edge] !== 1) continue;
      if (!union(edges[edge][0], edges[edge][1])) return false;
    }

    const componentTerminals = new Map();
    for (let cell = 0; cell < terminals.length; cell += 1) {
      if (terminals[cell] < 0) continue;
      const root = find(cell);
      const colors = componentTerminals.get(root) ?? [];
      colors.push(terminals[cell]);
      componentTerminals.set(root, colors);
    }

    for (const colors of componentTerminals.values()) {
      if (colors.length > 2) return false;
      if (colors.length === 2 && colors[0] !== colors[1]) return false;
    }

    if (targetLengths) {
      const roots = new Set(Array.from({ length: rows * cols }, (_, cell) => find(cell)));
      const longestTarget = Math.max(...targetLengths);

      for (const root of roots) {
        const colors = componentTerminals.get(root) ?? [];
        if (colors.length === 0 && sizes[root] >= longestTarget) return false;
        if (colors.length === 0) continue;

        const target = targetLengths[colors[0]];
        if (sizes[root] > target) return false;
        if (colors.length === 1 && sizes[root] >= target) return false;
        if (colors.length === 2 && sizes[root] !== target) return false;
      }
    }

    if (final) {
      const rootsByColor = new Map();
      for (let cell = 0; cell < terminals.length; cell += 1) {
        if (terminals[cell] < 0) continue;
        const color = terminals[cell];
        const root = find(cell);
        if (rootsByColor.has(color) && rootsByColor.get(color) !== root) return false;
        rootsByColor.set(color, root);
      }
      if (
        targetLengths &&
        [...rootsByColor].some(([color, root]) => sizes[root] !== targetLengths[color])
      ) {
        return false;
      }
      return rootsByColor.size === pairs.length;
    }

    // Every terminal must retain a route to its mate through edges that are not off.
    for (let color = 0; color < pairs.length; color += 1) {
      const [start, target] = pairs[color];
      const queue = [start];
      const seen = new Uint8Array(rows * cols);
      seen[start] = 1;

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const cell = queue[cursor];
        for (const edge of incident[cell]) {
          if (state[edge] === 0) continue;
          const [a, b] = edges[edge];
          const next = a === cell ? b : a;
          if (seen[next]) continue;
          if (terminals[next] >= 0 && terminals[next] !== color) continue;
          seen[next] = 1;
          queue.push(next);
        }
      }

      if (!seen[target]) return false;
    }

    return true;
  };

  const propagate = (state) => {
    let changed = true;
    while (changed) {
      changed = false;
      const { degree, unknown } = inspect(state);

      for (let cell = 0; cell < rows * cols; cell += 1) {
        const required = terminals[cell] >= 0 ? 1 : 2;
        if (degree[cell] > required || degree[cell] + unknown[cell].length < required) {
          return false;
        }

        if (degree[cell] === required) {
          for (const edge of unknown[cell]) {
            if (!setEdge(state, edge, 0)) return false;
            changed = true;
          }
        } else if (degree[cell] + unknown[cell].length === required) {
          for (const edge of unknown[cell]) {
            if (!setEdge(state, edge, 1)) return false;
            changed = true;
          }
        }
      }

      if (!componentsArePossible(state)) return false;
    }

    return true;
  };

  const search = (state) => {
    if (solutions.length >= solutionLimit || aborted) return;
    nodes += 1;
    if (nodes > nodeLimit) {
      aborted = true;
      return;
    }
    if (!propagate(state)) return;

    const { degree, unknown } = inspect(state);
    let branchCell = -1;
    let branchNeed = 0;
    let bestCombinations = Infinity;

    for (let cell = 0; cell < rows * cols; cell += 1) {
      const required = terminals[cell] >= 0 ? 1 : 2;
      const need = required - degree[cell];
      if (need === 0) continue;
      const choices = unknown[cell].length;
      const combinations = need === 1 ? choices : (choices * (choices - 1)) / 2;
      if (combinations < bestCombinations) {
        bestCombinations = combinations;
        branchCell = cell;
        branchNeed = need;
      }
    }

    if (branchCell === -1) {
      if (componentsArePossible(state, true)) solutions.push(state.slice());
      return;
    }

    const choices = unknown[branchCell];
    const combinations = [];
    if (branchNeed === 1) {
      for (const edge of choices) combinations.push([edge]);
    } else {
      for (let first = 0; first < choices.length; first += 1) {
        for (let second = first + 1; second < choices.length; second += 1) {
          combinations.push([choices[first], choices[second]]);
        }
      }
    }

    for (const selected of combinations) {
      const next = state.slice();
      const selectedSet = new Set(selected);
      let valid = true;
      for (const edge of choices) {
        if (!setEdge(next, edge, selectedSet.has(edge) ? 1 : 0)) {
          valid = false;
          break;
        }
      }
      if (valid) search(next);
      if (solutions.length >= solutionLimit || aborted) return;
    }
  };

  search(new Int8Array(edges.length).fill(-1));
  return { solutions, nodes, aborted, edges };
}

function randomHamiltonianPath(rows, cols, random) {
  const size = rows * cols;
  const visited = new Uint8Array(size);
  const path = [];
  const index = (row, col) => row * cols + col;
  const neighbors = (cell) => {
    const row = Math.floor(cell / cols);
    const col = cell % cols;
    return directions
      .map(([dr, dc]) => [row + dr, col + dc])
      .filter(([nextRow, nextCol]) =>
        nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols
      )
      .map(([nextRow, nextCol]) => index(nextRow, nextCol));
  };

  const unvisitedAreConnected = () => {
    let start = -1;
    let remaining = 0;
    for (let cell = 0; cell < size; cell += 1) {
      if (!visited[cell]) {
        remaining += 1;
        if (start < 0) start = cell;
      }
    }
    if (remaining < 2) return true;
    const queue = [start];
    const seen = new Uint8Array(size);
    seen[start] = 1;
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      for (const next of neighbors(queue[cursor])) {
        if (visited[next] || seen[next]) continue;
        seen[next] = 1;
        queue.push(next);
      }
    }
    return queue.length === remaining;
  };

  const visit = (cell) => {
    visited[cell] = 1;
    path.push(cell);
    if (path.length === size) return true;
    if (!unvisitedAreConnected()) {
      path.pop();
      visited[cell] = 0;
      return false;
    }

    const candidates = neighbors(cell)
      .filter((next) => !visited[next])
      .map((next) => ({
        next,
        onward: neighbors(next).filter((candidate) => !visited[candidate]).length,
        noise: random()
      }))
      .sort((a, b) => a.onward - b.onward || a.noise - b.noise);

    for (const candidate of candidates) {
      if (visit(candidate.next)) return true;
    }
    path.pop();
    visited[cell] = 0;
    return false;
  };

  const starts = Array.from({ length: size }, (_, cell) => ({
    cell,
    noise: random()
  })).sort((a, b) => a.noise - b.noise);

  for (const start of starts) {
    if (visit(start.cell)) return [...path];
  }
  return null;
}

function randomLengths(total, count, minimum, random) {
  const lengths = Array(count).fill(minimum);
  for (let remaining = total - count * minimum; remaining > 0; remaining -= 1) {
    lengths[Math.floor(random() * count)] += 1;
  }
  return lengths;
}

function randomDistinctLengths(total, count, minimum, random) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const lengths = randomLengths(total, count, minimum, random);
    if (new Set(lengths).size === lengths.length) return lengths;
  }
  return null;
}

function toPoint(cell, cols) {
  return { row: Math.floor(cell / cols), col: cell % cols };
}

function makeCandidate(rows, cols, colorCount, random, distinctLengths = false) {
  const traversal = randomHamiltonianPath(rows, cols, random);
  if (!traversal) return null;
  const lengths = distinctLengths
    ? randomDistinctLengths(rows * cols, colorCount, 2, random)
    : randomLengths(rows * cols, colorCount, 4, random);
  if (!lengths) return null;
  const pairs = [];
  const paths = [];
  let cursor = 0;

  for (const length of lengths) {
    const path = traversal.slice(cursor, cursor + length);
    const start = path[0];
    const end = path[path.length - 1];
    const startPoint = toPoint(start, cols);
    const endPoint = toPoint(end, cols);
    const distance =
      Math.abs(startPoint.row - endPoint.row) + Math.abs(startPoint.col - endPoint.col);
    if (distance < 3) return null;
    pairs.push([start, end]);
    paths.push(path);
    cursor += length;
  }

  return { pairs, paths };
}

function formatCandidate(rows, cols, candidate, result) {
  return JSON.stringify({
    rows,
    cols,
    nodes: result.nodes,
    pairs: candidate.pairs.map((pair) => pair.map((cell) => toPoint(cell, cols))),
    solution: candidate.paths.map((path) => path.map((cell) => toPoint(cell, cols)))
  });
}

export function extractPaths(rows, cols, pairs, state, edges) {
  const adjacent = Array.from({ length: rows * cols }, () => []);
  edges.forEach(([a, b], edge) => {
    if (state[edge] !== 1) return;
    adjacent[a].push(b);
    adjacent[b].push(a);
  });

  return pairs.map(([start, end]) => {
    const path = [start];
    let previous = -1;
    let current = start;
    while (current !== end) {
      const next = adjacent[current].find((cell) => cell !== previous);
      if (next === undefined) throw new Error("Broken solved path");
      path.push(next);
      previous = current;
      current = next;
    }
    return path.map((cell) => toPoint(cell, cols));
  });
}

function main() {
  if (process.argv[2] === "--rank" || process.argv[2] === "--rank-end") {
    const numberEnd = process.argv[2] === "--rank-end";
    const lines = readFileSync(0, "utf8").split(/\r?\n/);
    const ranked = [];

    for (let cursor = 0; cursor < lines.length; cursor += 1) {
      const size = lines[cursor].match(/^(\d+) (\d+)$/);
      if (!size) continue;
      const cols = Number(size[1]);
      const rows = Number(size[2]);
      const clues = lines.slice(cursor + 1, cursor + 1 + rows);
      if (clues.some((line) => line.length !== cols)) continue;

      const cellsByColor = new Map();
      clues.forEach((line, row) => {
        [...line].forEach((value, col) => {
          if (value === ".") return;
          const cells = cellsByColor.get(value) ?? [];
          cells.push(row * cols + col);
          cellsByColor.set(value, cells);
        });
      });
      const pairs = [...cellsByColor.values()];
      if (pairs.some((pair) => pair.length !== 2)) continue;

      let targetLengths = null;
      if (numberEnd) {
        const solutionMarker = lines.indexOf("Solution:", cursor + rows + 1);
        const solvedRows = lines.slice(solutionMarker + 1, solutionMarker + 1 + rows);
        if (
          solutionMarker < 0 ||
          solvedRows.some((line) => line.length !== cols)
        ) {
          continue;
        }
        targetLengths = [...cellsByColor.keys()].map((color) =>
          solvedRows.reduce(
            (total, line) => total + [...line].filter((value) => value === color).length,
            0
          )
        );
        if (new Set(targetLengths).size !== targetLengths.length) continue;
      }

      const result = solveNumberlink(
        rows,
        cols,
        pairs,
        2,
        numberEnd ? 100_000 : 5_000_000,
        targetLengths
      );
      if (!result.aborted && result.solutions.length === 1) {
        ranked.push({
          rows,
          cols,
          nodes: result.nodes,
          clues,
          targetLengths,
          paths: extractPaths(rows, cols, pairs, result.solutions[0], result.edges)
        });
      }
      cursor += rows;
    }

    ranked.sort((a, b) => b.nodes - a.nodes);
    console.log(JSON.stringify(ranked.slice(0, 12), null, 2));
    return;
  }

  const numberEnd = process.argv[2] === "--number-end";
  const offset = numberEnd ? 1 : 0;
  const seed = Number(process.argv[2 + offset] ?? 20260904);
  const rows = Number(process.argv[3 + offset] ?? 7);
  const cols = Number(process.argv[4 + offset] ?? rows);
  const colorCount = Number(process.argv[5 + offset] ?? 6);
  const attempts = Number(process.argv[6 + offset] ?? 500);
  const random = createRandom(seed);
  const best = [];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = makeCandidate(rows, cols, colorCount, random, numberEnd);
    if (!candidate) continue;
    const result = solveNumberlink(
      rows,
      cols,
      candidate.pairs,
      2,
      numberEnd ? 50_000 : 1_000_000,
      numberEnd ? candidate.paths.map((path) => path.length) : null
    );
    if (result.aborted || result.solutions.length !== 1) continue;

    best.push({ candidate, result });
    best.sort((a, b) => b.result.nodes - a.result.nodes);
    best.length = Math.min(best.length, 5);
    if (attempt % 25 === 0) {
      console.error(`attempt=${attempt} best=${best[0]?.result.nodes ?? 0}`);
    }
  }

  for (const entry of best) {
    console.log(formatCandidate(rows, cols, entry.candidate, entry.result));
  }
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  main();
}
