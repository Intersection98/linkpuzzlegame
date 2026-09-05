import { SLITHERLINK_LEVELS } from "../src/slitherlinkLevels";
import { getCellEdges, type EdgeKey } from "../src/slitherlink";
import type { Point } from "../src/game";

function key(point: Point): string {
  return `${point.row}:${point.col}`;
}

function regionBoundary(cells: Point[]): EdgeKey[] {
  const members = new Set(cells.map(key));
  const boundary = new Set<EdgeKey>();
  cells.forEach((cell) => {
    const neighbors = [
      { row: cell.row - 1, col: cell.col },
      { row: cell.row, col: cell.col + 1 },
      { row: cell.row + 1, col: cell.col },
      { row: cell.row, col: cell.col - 1 }
    ];
    getCellEdges(cell.row, cell.col).forEach((edge, index) => {
      if (!members.has(key(neighbors[index]))) boundary.add(edge);
    });
  });
  return [...boundary];
}

function makeRegions(levelIndex: number): Point[][] {
  const level = SLITHERLINK_LEVELS[levelIndex];
  const solution = new Set(level.solutionEdges);
  const candidates = new Map<string, Point[]>();
  const addCandidate = (cells: Point[]) => {
    const sorted = [...cells].sort((a, b) => a.row - b.row || a.col - b.col);
    const signature = sorted.map(key).join("|");
    if (candidates.has(signature)) return;
    const boundary = regionBoundary(sorted);
    const unused = boundary.filter((edge) => !solution.has(edge)).length;
    if (unused === sorted.length) candidates.set(signature, sorted);
  };

  const expand = (cells: Point[], members: Set<string>) => {
    addCandidate(cells);
    if (cells.length >= 8) return;
    const frontier = new Map<string, Point>();
    cells.forEach((cell) => {
      [
        { row: cell.row - 1, col: cell.col },
        { row: cell.row + 1, col: cell.col },
        { row: cell.row, col: cell.col - 1 },
        { row: cell.row, col: cell.col + 1 }
      ].forEach((next) => {
        if (
          next.row >= 0 &&
          next.row < level.rows &&
          next.col >= 0 &&
          next.col < level.cols &&
          !members.has(key(next))
        ) {
          frontier.set(key(next), next);
        }
      });
    });
    frontier.forEach((next) => {
      const nextMembers = new Set(members);
      nextMembers.add(key(next));
      expand([...cells, next], nextMembers);
    });
  };

  for (let row = 0; row < level.rows; row += 1) {
    for (let col = 0; col < level.cols; col += 1) {
      const point = { row, col };
      expand([point], new Set([key(point)]));
    }
  }

  const allCandidates = [...candidates.values()];
  const byCell = new Map<string, Point[][]>();
  allCandidates.forEach((region) => {
    region.forEach((cell) => {
      const cellKey = key(cell);
      byCell.set(cellKey, [...(byCell.get(cellKey) ?? []), region]);
    });
  });
  const covered = new Set<string>();
  const result: Point[][] = [];

  const search = (): boolean => {
    if (covered.size === level.rows * level.cols) return true;
    let target = "";
    let options: Point[][] = [];
    for (let row = 0; row < level.rows; row += 1) {
      for (let col = 0; col < level.cols; col += 1) {
        const cell = `${row}:${col}`;
        if (covered.has(cell)) continue;
        const available = (byCell.get(cell) ?? []).filter((region) =>
          region.every((point) => !covered.has(key(point)))
        );
        if (!target || available.length < options.length) {
          target = cell;
          options = available;
        }
      }
    }
    options.sort((a, b) => b.length - a.length);
    for (const region of options) {
      region.forEach((cell) => covered.add(key(cell)));
      result.push(region);
      if (search()) return true;
      result.pop();
      region.forEach((cell) => covered.delete(key(cell)));
    }
    return false;
  };

  if (!search()) throw new Error(`No region partition for level ${level.id}`);
  return result;
}

for (const index of [2, 3, 5, 6, 7, 7, 8, 9]) {
  const source = SLITHERLINK_LEVELS[index];
  const regions = makeRegions(index);
  console.log(JSON.stringify({
    source: source.id,
    size: `${source.rows}x${source.cols}`,
    regions
  }));
}
