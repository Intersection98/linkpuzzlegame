import { describe, expect, it } from "vitest";
import { solveCellLoop } from "../scripts/verify-cell-loops";
import { solvePipelink } from "../scripts/verify-pipelink";
import {
  BALANCE_LOOP_LEVELS,
  CELL_LOOP_LEVELS,
  GERADEWEG_LEVELS,
  MASYU_LEVELS,
  MIDLOOP_LEVELS,
  PIPELINK_LEVELS,
  SHINGOKI_LEVELS
} from "./cellLoopLevels";
import {
  getCellLoopClueState,
  solutionMarks,
  validateCellLoop,
  type CellEdgeKey,
  type CellLoopClue,
  type CellLoopLevel
} from "./cellLoop";

type GridPoint = { row: number; col: number };

function transformPoint(
  point: GridPoint,
  size: number,
  variant: number
): GridPoint {
  const { row, col } = point;
  if (variant === 0) return { row, col };
  if (variant === 1) return { row: col, col: size - 1 - row };
  if (variant === 2) {
    return { row: size - 1 - row, col: size - 1 - col };
  }
  if (variant === 3) return { row: size - 1 - col, col: row };
  if (variant === 4) return { row, col: size - 1 - col };
  if (variant === 5) {
    return { row: size - 1 - col, col: size - 1 - row };
  }
  if (variant === 6) return { row: size - 1 - row, col };
  return { row: col, col: row };
}

function edgeEndpoints(edge: CellEdgeKey): [GridPoint, GridPoint] {
  const [orientation, rowValue, colValue] = edge.split(":");
  const row = Number(rowValue);
  const col = Number(colValue);
  return orientation === "ch"
    ? [{ row, col }, { row, col: col + 1 }]
    : [{ row, col }, { row: row + 1, col }];
}

function pointKey(point: GridPoint): string {
  return `${point.row}:${point.col}`;
}

function transformedEdgeKey(
  edge: CellEdgeKey,
  size: number,
  variant: number
): string {
  return edgeEndpoints(edge)
    .map((point) => transformPoint(point, size, variant))
    .map(pointKey)
    .sort()
    .join("-");
}

function canonicalEdgeSignature(level: CellLoopLevel): string {
  return Array.from({ length: 8 }, (_, variant) =>
    level.solutionEdges
      .map((edge) => transformedEdgeKey(edge, level.rows, variant))
      .sort()
      .join(",")
  ).sort()[0];
}

function transformedClueKey(
  clue: CellLoopClue,
  size: number,
  variant: number
): string {
  return clue.kind === "mid-edge"
    ? `edge:${transformedEdgeKey(clue.edge!, size, variant)}`
    : `cell:${pointKey(transformPoint(clue, size, variant))}`;
}

function canonicalClueSignature(level: CellLoopLevel): string {
  return Array.from({ length: 8 }, (_, variant) =>
    level.loopClues
      .map((clue) => transformedClueKey(clue, level.rows, variant))
      .sort()
      .join(",")
  ).sort()[0];
}

function solutionAxis(
  level: CellLoopLevel,
  point: GridPoint
): "horizontal" | "vertical" | "turn" | "unused" {
  const solution = new Set(level.solutionEdges);
  const directions = [
    solution.has(`cv:${point.row - 1}:${point.col}` as CellEdgeKey),
    solution.has(`ch:${point.row}:${point.col}` as CellEdgeKey),
    solution.has(`cv:${point.row}:${point.col}` as CellEdgeKey),
    solution.has(`ch:${point.row}:${point.col - 1}` as CellEdgeKey)
  ].flatMap((selected, direction) => (selected ? [direction] : []));
  if (directions.length !== 2) return "unused";
  if (directions.includes(0) && directions.includes(2)) return "vertical";
  if (directions.includes(1) && directions.includes(3)) return "horizontal";
  return "turn";
}

describe("cell loop chapters", () => {
  it("contains every planned level", () => {
    expect(CELL_LOOP_LEVELS).toHaveLength(48);
    expect(PIPELINK_LEVELS.map((level) => level.id)).toEqual([
      37, 38, 39, 40, 41, 42, 43, 44
    ]);
    expect(MASYU_LEVELS.map((level) => level.id)).toEqual([
      61, 62, 63, 64, 65, 66, 67, 68
    ]);
    expect(MIDLOOP_LEVELS.map((level) => level.id)).toEqual([
      69, 70, 71, 72, 73, 74, 75, 76
    ]);
    expect(BALANCE_LOOP_LEVELS.map((level) => level.id)).toEqual([
      77, 78, 79, 80, 81, 82, 83, 84
    ]);
    expect(GERADEWEG_LEVELS.map((level) => level.id)).toEqual([
      85, 86, 87, 88, 89, 90, 91, 92
    ]);
    expect(SHINGOKI_LEVELS.map((level) => level.id)).toEqual([
      93, 94, 95, 96, 97, 98, 99, 100
    ]);
  });

  it("uses the planned Pipelink sizes and fixed pipe shapes", () => {
    expect(PIPELINK_LEVELS.map(({ rows, cols }) => [rows, cols])).toEqual([
      [4, 4],
      [4, 4],
      [5, 5],
      [6, 6],
      [6, 6],
      [6, 6],
      [7, 7],
      [7, 7]
    ]);
    expect(PIPELINK_LEVELS.every((level) => level.pipeClues?.length)).toBe(true);
    expect(
      PIPELINK_LEVELS.some((level) =>
        level.pipeClues?.some((clue) => clue.directions.length === 4)
      )
    ).toBe(true);
  });

  it("stages Masyu from isolated pearl rules to sparse mixed deductions", () => {
    expect(MASYU_LEVELS.map(({ rows, cols }) => [rows, cols])).toEqual([
      [4, 4],
      [5, 5],
      [5, 5],
      [6, 6],
      [6, 6],
      [6, 6],
      [7, 7],
      [8, 8]
    ]);
    expect(MASYU_LEVELS.map((level) => level.difficulty)).toEqual([
      "入门",
      "入门",
      "简单",
      "简单",
      "进阶",
      "困难",
      "专家",
      "极限"
    ]);
    expect(
      MASYU_LEVELS[0].loopClues.every((clue) => clue.kind === "white")
    ).toBe(true);
    expect(
      MASYU_LEVELS[1].loopClues.every((clue) => clue.kind === "black")
    ).toBe(true);
    expect(
      MASYU_LEVELS[3].loopClues.some(
        (clue) =>
          clue.kind === "black" &&
          MASYU_LEVELS[3].loopClues.some(
            (other) =>
              other.kind === "black" &&
              Math.abs(other.row - clue.row) +
                Math.abs(other.col - clue.col) ===
                1
          )
      )
    ).toBe(true);
    expect(
      MASYU_LEVELS[4].loopClues.some(
        (clue) =>
          clue.kind === "white" &&
          MASYU_LEVELS[4].loopClues.some(
            (other) =>
              other.kind === "white" &&
              other.row === clue.row &&
              other.col === clue.col + 1
          ) &&
          MASYU_LEVELS[4].loopClues.some(
            (other) =>
              other.kind === "white" &&
              other.row === clue.row &&
              other.col === clue.col + 2
          )
      )
    ).toBe(true);
  });

  it.each(MASYU_LEVELS.map((level, index) => ({
    level,
    minimumNodes: [5, 5, 5, 15, 20, 40, 150, 4000][index]
  })))(
    "Masyu level $level.id has one solution above its difficulty floor",
    ({ level, minimumNodes }) => {
      const result = solveCellLoop(level);
      expect(result.aborted).toBe(false);
      expect(result.count).toBe(1);
      expect(result.nodes).toBeGreaterThanOrEqual(minimumNodes);
    }
  );

  it("stages Geradeweg from straight segments to mixed sparse loops", () => {
    expect(GERADEWEG_LEVELS.map(({ rows, cols }) => [rows, cols])).toEqual([
      [5, 5],
      [5, 5],
      [6, 6],
      [6, 6],
      [7, 7],
      [7, 7],
      [7, 7],
      [7, 7]
    ]);
    expect(GERADEWEG_LEVELS.map((level) => level.difficulty)).toEqual([
      "入门",
      "入门",
      "简单",
      "简单",
      "进阶",
      "困难",
      "专家",
      "极限"
    ]);
    expect(
      GERADEWEG_LEVELS.every((level) =>
        level.loopClues.every(
          (clue) => clue.kind === "length" && clue.value !== undefined
        )
      )
    ).toBe(true);
    expect(
      GERADEWEG_LEVELS[0].loopClues.every(
        (clue) => solutionAxis(GERADEWEG_LEVELS[0], clue) !== "turn"
      )
    ).toBe(true);
    expect(
      GERADEWEG_LEVELS[2].loopClues.every(
        (clue) => solutionAxis(GERADEWEG_LEVELS[2], clue) === "turn"
      )
    ).toBe(true);

    const sharedStraightSegment = GERADEWEG_LEVELS[1].loopClues.some(
      (clue, index, clues) =>
        clues.slice(index + 1).some(
          (other) =>
            clue.value === other.value &&
            ((clue.row === other.row &&
              solutionAxis(GERADEWEG_LEVELS[1], clue) === "horizontal" &&
              solutionAxis(GERADEWEG_LEVELS[1], other) === "horizontal") ||
              (clue.col === other.col &&
                solutionAxis(GERADEWEG_LEVELS[1], clue) === "vertical" &&
                solutionAxis(GERADEWEG_LEVELS[1], other) === "vertical"))
        )
    );
    expect(sharedStraightSegment).toBe(true);
  });

  it.each(GERADEWEG_LEVELS.map((level, index) => ({
    level,
    minimumNodes: [10, 20, 90, 200, 210, 300, 600, 950][index]
  })))(
    "Geradeweg level $level.id has one solution above its difficulty floor",
    ({ level, minimumNodes }) => {
      const result = solveCellLoop(level);
      expect(result.aborted).toBe(false);
      expect(result.count).toBe(1);
      expect(result.nodes).toBeGreaterThanOrEqual(minimumNodes);
    }
  );

  it("stages Shingoki from single-color rules to a sparse mixed finale", () => {
    expect(SHINGOKI_LEVELS.map(({ rows, cols }) => [rows, cols])).toEqual([
      [5, 5],
      [5, 5],
      [6, 6],
      [6, 6],
      [7, 7],
      [7, 7],
      [7, 7],
      [8, 8]
    ]);
    expect(SHINGOKI_LEVELS.map((level) => level.difficulty)).toEqual([
      "入门",
      "入门",
      "简单",
      "进阶",
      "困难",
      "专家",
      "极限",
      "终极"
    ]);
    expect(
      SHINGOKI_LEVELS[0].loopClues.every((clue) => clue.kind === "white")
    ).toBe(true);
    expect(
      SHINGOKI_LEVELS[1].loopClues.every((clue) => clue.kind === "black")
    ).toBe(true);
    expect(
      SHINGOKI_LEVELS.slice(2).every((level) =>
        level.loopClues.every((clue) => clue.value !== undefined)
      )
    ).toBe(true);
    for (const level of [SHINGOKI_LEVELS[4], SHINGOKI_LEVELS[6], SHINGOKI_LEVELS[7]]) {
      expect(level.loopClues.some((clue) => clue.kind === "white")).toBe(true);
      expect(level.loopClues.some((clue) => clue.kind === "black")).toBe(true);
      expect(level.loopClues.some((clue) => clue.kind === "gray")).toBe(true);
    }
  });

  it.each(SHINGOKI_LEVELS.slice(0, -1).map((level, index) => ({
    level,
    minimumNodes: [10, 25, 45, 90, 300, 450, 700][index]
  })))(
    "Shingoki level $level.id has one solution above its difficulty floor",
    ({ level, minimumNodes }) => {
      const result = solveCellLoop(level);
      expect(result.aborted).toBe(false);
      expect(result.count).toBe(1);
      expect(result.nodes).toBeGreaterThanOrEqual(minimumNodes);
    }
  );

  it("makes the Shingoki finale dense, color-hidden, unique, and irreducible", () => {
    const finale = SHINGOKI_LEVELS.at(-1)!;
    expect(finale.rows).toBe(8);
    expect(finale.cols).toBe(8);
    expect(finale.solutionEdges).toHaveLength(62);
    expect(finale.loopClues).toHaveLength(10);
    expect(
      finale.loopClues.filter((clue) => clue.kind === "gray")
    ).toHaveLength(5);

    const result = solveCellLoop(finale);
    expect(result.aborted).toBe(false);
    expect(result.count).toBe(1);

    finale.loopClues.forEach((_, removedIndex) => {
      const withoutClue = solveCellLoop({
        ...finale,
        loopClues: finale.loopClues.filter(
          (_, clueIndex) => clueIndex !== removedIndex
        )
      });
      expect(withoutClue.aborted).toBe(false);
      expect(
        withoutClue.count,
        `Shingoki finale clue ${removedIndex} is redundant`
      ).toBe(2);
    });
  });

  it("uses distinct Shingoki clues and solutions under rotation or reflection", () => {
    const clueSignatures = SHINGOKI_LEVELS.map(
      (level) => `${level.rows}:${canonicalClueSignature(level)}`
    );
    const solutionSignatures = SHINGOKI_LEVELS.map(
      (level) => `${level.rows}:${canonicalEdgeSignature(level)}`
    );
    expect(new Set(clueSignatures).size).toBe(SHINGOKI_LEVELS.length);
    expect(new Set(solutionSignatures).size).toBe(SHINGOKI_LEVELS.length);
  });

  it("counts Geradeweg straight lengths by edges between turns", () => {
    const level = GERADEWEG_LEVELS[0];
    const marks = solutionMarks(level);
    const clue = level.loopClues.find(
      (candidate) => candidate.row === 1 && candidate.col === 1
    )!;

    expect(clue.value).toBe(3);
    expect(getCellLoopClueState(level, clue, marks)).toBe("matched");
    expect(
      getCellLoopClueState(level, { ...clue, value: 4 }, marks)
    ).toBe("invalid");
  });

  it("uses distinct Geradeweg clues and solutions under rotation or reflection", () => {
    const clueSignatures = GERADEWEG_LEVELS.map(
      (level) => `${level.rows}:${canonicalClueSignature(level)}`
    );
    const solutionSignatures = GERADEWEG_LEVELS.map(
      (level) => `${level.rows}:${canonicalEdgeSignature(level)}`
    );
    expect(new Set(clueSignatures).size).toBe(GERADEWEG_LEVELS.length);
    expect(new Set(solutionSignatures).size).toBe(GERADEWEG_LEVELS.length);
  });

  it.each(CELL_LOOP_LEVELS)(
    "level $id accepts its canonical solution",
    (level) => {
      const marks = solutionMarks(level);
      expect(validateCellLoop(level, marks)).toEqual({ complete: true });
      level.loopClues.forEach((clue) => {
        expect(getCellLoopClueState(level, clue, marks)).toBe("matched");
      });
    }
  );

  it("keeps only the two finales above the 7x7 limit", () => {
    expect(
      CELL_LOOP_LEVELS.every(
        (level) =>
          ([68, 100].includes(level.id) &&
            level.rows === 8 &&
            level.cols === 8) ||
          (level.rows <= 7 && level.cols <= 7)
      )
    ).toBe(true);
  });

  it("uses distinct Mid-loop clues and solutions under rotation or reflection", () => {
    expect(MIDLOOP_LEVELS.map(({ rows, cols }) => [rows, cols])).toEqual([
      [3, 3],
      [5, 5],
      [6, 6],
      [6, 6],
      [6, 6],
      [6, 6],
      [7, 7],
      [7, 7]
    ]);

    const clueSignatures = MIDLOOP_LEVELS.map(
      (level) => `${level.rows}:${canonicalClueSignature(level)}`
    );
    const solutionSignatures = MIDLOOP_LEVELS.map(
      (level) => `${level.rows}:${canonicalEdgeSignature(level)}`
    );
    expect(new Set(clueSignatures).size).toBe(MIDLOOP_LEVELS.length);
    expect(new Set(solutionSignatures).size).toBe(MIDLOOP_LEVELS.length);
  });

  it("starts Mid-loop with a cell-center-only teaching level", () => {
    expect(MIDLOOP_LEVELS[0].rows).toBe(3);
    expect(
      MIDLOOP_LEVELS[0].loopClues.every((clue) => clue.kind === "mid-cell")
    ).toBe(true);
  });

  it("keeps the final Mid-loop levels unique and search-heavy", () => {
    const results = MIDLOOP_LEVELS.slice(-2).map((level) =>
      solveCellLoop(level)
    );
    expect(
      results.every((result) => !result.aborted && result.count === 1)
    ).toBe(true);
    expect(results[0].nodes).toBeGreaterThanOrEqual(150);
    expect(results[1].nodes).toBeGreaterThanOrEqual(200);
  });

  it("stages Balance Loop from plain equality to mixed numbered clues", () => {
    expect(BALANCE_LOOP_LEVELS.map(({ rows, cols }) => [rows, cols])).toEqual([
      [4, 4],
      [5, 5],
      [5, 5],
      [5, 5],
      [6, 6],
      [6, 6],
      [7, 7],
      [7, 7]
    ]);
    expect(BALANCE_LOOP_LEVELS.map((level) => level.difficulty)).toEqual([
      "入门",
      "简单",
      "简单",
      "进阶",
      "进阶",
      "困难",
      "专家",
      "极限"
    ]);

    for (const level of BALANCE_LOOP_LEVELS.slice(0, 2)) {
      expect(
        level.loopClues.every(
          (clue) => clue.kind === "white" && clue.value === undefined
        )
      ).toBe(true);
    }
    for (const level of BALANCE_LOOP_LEVELS.slice(2, 4)) {
      expect(level.loopClues.every((clue) => clue.value === undefined)).toBe(true);
      expect(level.loopClues.some((clue) => clue.kind === "white")).toBe(true);
      expect(level.loopClues.some((clue) => clue.kind === "black")).toBe(true);
    }

    expect(
      BALANCE_LOOP_LEVELS[4].loopClues.every(
        (clue) => clue.kind === "white" && clue.value !== undefined
      )
    ).toBe(true);
    for (const level of BALANCE_LOOP_LEVELS.slice(5, 7)) {
      expect(level.loopClues.every((clue) => clue.value !== undefined)).toBe(true);
      expect(level.loopClues.some((clue) => clue.kind === "white")).toBe(true);
      expect(level.loopClues.some((clue) => clue.kind === "black")).toBe(true);
    }
    expect(
      BALANCE_LOOP_LEVELS[7].loopClues.some(
        (clue) => clue.value === undefined
      )
    ).toBe(true);
    expect(
      BALANCE_LOOP_LEVELS[7].loopClues.some(
        (clue) => clue.value !== undefined
      )
    ).toBe(true);
  });

  it("uses distinct Balance Loop solutions under rotation or reflection", () => {
    const solutionSignatures = BALANCE_LOOP_LEVELS.map(
      (level) => `${level.rows}:${canonicalEdgeSignature(level)}`
    );
    expect(new Set(solutionSignatures).size).toBe(
      BALANCE_LOOP_LEVELS.length
    );
  });

  it.each(BALANCE_LOOP_LEVELS.map((level, index) => ({
    level,
    minimumNodes: [10, 30, 70, 120, 150, 170, 300, 700][index]
  })))(
    "Balance Loop level $level.id has one solution above its difficulty floor",
    ({ level, minimumNodes }) => {
      const result = solveCellLoop(level);
      expect(result.aborted).toBe(false);
      expect(result.count).toBe(1);
      expect(result.nodes).toBeGreaterThanOrEqual(minimumNodes);
    }
  );

  it.each(PIPELINK_LEVELS)(
    "Pipelink level $id has exactly one solution",
    (level) => {
      const result = solvePipelink(level);
      expect(result.aborted).toBe(false);
      expect(result.count).toBe(1);
    }
  );

  it("treats a four-way pipe as a crossing instead of a branch", () => {
    const level: CellLoopLevel = {
      id: 0,
      chapter: 5,
      chapterTitle: "管道回路",
      mode: "pipelink",
      title: "交叉测试",
      difficulty: "测试",
      rows: 3,
      cols: 3,
      colors: [],
      endpoints: {},
      solution: {},
      blockedCells: [
        { row: 0, col: 2 },
        { row: 2, col: 0 }
      ],
      prefilledEdges: [],
      pipeClues: [
        {
          row: 1,
          col: 1,
          directions: ["up", "right", "down", "left"]
        }
      ],
      loopClues: [],
      solutionEdges: [
        "ch:1:1",
        "cv:1:2",
        "ch:2:1",
        "cv:1:1",
        "cv:0:1",
        "ch:0:0",
        "cv:0:0",
        "ch:1:0"
      ]
    };

    expect(validateCellLoop(level, solutionMarks(level))).toEqual({
      complete: true
    });
    expect(
      validateCellLoop(
        {
          ...level,
          pipeClues: [
            { row: 1, col: 1, directions: ["up", "right"] }
          ]
        },
        solutionMarks(level)
      )
    ).toEqual({ complete: false, reason: "pipe-clue-mismatch" });
  });
});
