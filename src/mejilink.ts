import type { NumberlinkLevel, Point } from "./game";
import {
  findEdgeLoopConflict,
  getCellEdges,
  getSlitherlinkEdges,
  validateEdgeLoop,
  type EdgeGeometry,
  type EdgeKey,
  type EdgeMap
} from "./slitherlink";

export type MejilinkRegion = {
  id: string;
  cells: Point[];
  boundaryEdges: EdgeKey[];
};

export type MejilinkLevel = Omit<
  NumberlinkLevel,
  "mode" | "chapter" | "solutionEdges"
> & {
  mode: "mejilink";
  chapter: 4;
  regions: MejilinkRegion[];
  regionGrid: string[][];
  playableEdges: EdgeKey[];
  solutionEdges: EdgeKey[];
};

export function isMejilinkLevel(
  level: NumberlinkLevel
): level is MejilinkLevel {
  return level.mode === "mejilink" && "regions" in level;
}

export function getRegionBoundary(cells: Point[]): EdgeKey[] {
  const members = new Set(cells.map((cell) => `${cell.row}:${cell.col}`));
  const boundary = new Set<EdgeKey>();

  cells.forEach((cell) => {
    const neighbors = [
      { row: cell.row - 1, col: cell.col },
      { row: cell.row, col: cell.col + 1 },
      { row: cell.row + 1, col: cell.col },
      { row: cell.row, col: cell.col - 1 }
    ];
    getCellEdges(cell.row, cell.col).forEach((edge, index) => {
      const neighbor = neighbors[index];
      if (!members.has(`${neighbor.row}:${neighbor.col}`)) boundary.add(edge);
    });
  });

  return [...boundary];
}

export function parseRegions(regionGrid: string[]): {
  grid: string[][];
  regions: MejilinkRegion[];
} {
  const grid = regionGrid.map((row) => row.split(","));
  const cellsByRegion = new Map<string, Point[]>();
  grid.forEach((row, rowIndex) => {
    row.forEach((id, colIndex) => {
      cellsByRegion.set(id, [
        ...(cellsByRegion.get(id) ?? []),
        { row: rowIndex, col: colIndex }
      ]);
    });
  });

  return {
    grid,
    regions: [...cellsByRegion.entries()].map(([id, cells]) => ({
      id,
      cells,
      boundaryEdges: getRegionBoundary(cells)
    }))
  };
}

export function getMejilinkEdges(level: MejilinkLevel): EdgeGeometry[] {
  const boundaryEdges = new Set(level.playableEdges);
  return getSlitherlinkEdges(level.rows, level.cols).filter((edge) =>
    boundaryEdges.has(edge.key)
  );
}

export function isMejilinkBoundaryEdge(
  level: MejilinkLevel,
  edge: EdgeKey
): boolean {
  return level.playableEdges.includes(edge);
}

export function getMejilinkRegionState(
  region: MejilinkRegion,
  marks: EdgeMap
): { unused: number; state: "pending" | "matched" | "exceeded" } {
  const lineCount = region.boundaryEdges.filter(
    (edge) => marks[edge] === "line"
  ).length;
  const unused = region.boundaryEdges.length - lineCount;
  return {
    unused,
    state:
      unused === region.cells.length
        ? "matched"
        : unused < region.cells.length
          ? "exceeded"
          : "pending"
  };
}

export function validateMejilink(
  level: MejilinkLevel,
  marks: EdgeMap
): { complete: boolean; reason?: string } {
  if (
    Object.entries(marks).some(
      ([edge, mark]) =>
        mark === "line" &&
        !isMejilinkBoundaryEdge(level, edge as EdgeKey)
    )
  ) {
    return { complete: false, reason: "invalid-edge" };
  }
  if (
    level.regions.some(
      (region) => getMejilinkRegionState(region, marks).state !== "matched"
    )
  ) {
    return { complete: false, reason: "region-mismatch" };
  }
  return validateEdgeLoop(level.rows, level.cols, marks);
}

export function findMejilinkConflict(
  level: MejilinkLevel,
  marks: EdgeMap
): string | null {
  if (
    Object.entries(marks).some(
      ([edge, mark]) =>
        mark === "line" &&
        !isMejilinkBoundaryEdge(level, edge as EdgeKey)
    )
  ) {
    return "只能沿区域边界画线";
  }
  return findEdgeLoopConflict(level.rows, level.cols, marks);
}

export function mejilinkProgress(
  level: MejilinkLevel,
  marks: EdgeMap
): { lineCount: number; matchedRegions: number; regionCount: number } {
  return {
    lineCount: Object.values(marks).filter((mark) => mark === "line").length,
    matchedRegions: level.regions.filter(
      (region) => getMejilinkRegionState(region, marks).state === "matched"
    ).length,
    regionCount: level.regions.length
  };
}
