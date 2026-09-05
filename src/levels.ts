import {
  FLOW_COLORS,
  type NumberlinkLevel,
  type PathMap,
  type Point
} from "./game";

type Traversal = "rows" | "columns" | "spiral";

type LevelSeedBase = {
  id: number;
  title: string;
  difficulty: string;
  rows: number;
  cols: number;
};

type GeneratedLevelSeed = LevelSeedBase & {
  traversal: Traversal;
  lengths: number[];
  offset?: number;
  reverse?: boolean;
};

type AuthoredLevelSeed = LevelSeedBase & {
  paths: Point[][];
};

type LevelSeed = GeneratedLevelSeed | AuthoredLevelSeed;

function snakeRows(rows: number, cols: number): Point[] {
  const points: Point[] = [];

  for (let row = 0; row < rows; row += 1) {
    const columns = Array.from({ length: cols }, (_, col) => col);
    if (row % 2 === 1) columns.reverse();
    columns.forEach((col) => points.push({ row, col }));
  }

  return points;
}

function snakeColumns(rows: number, cols: number): Point[] {
  const points: Point[] = [];

  for (let col = 0; col < cols; col += 1) {
    const rowIndexes = Array.from({ length: rows }, (_, row) => row);
    if (col % 2 === 1) rowIndexes.reverse();
    rowIndexes.forEach((row) => points.push({ row, col }));
  }

  return points;
}

function spiral(rows: number, cols: number): Point[] {
  const points: Point[] = [];
  let top = 0;
  let right = cols - 1;
  let bottom = rows - 1;
  let left = 0;

  while (top <= bottom && left <= right) {
    for (let col = left; col <= right; col += 1) {
      points.push({ row: top, col });
    }
    top += 1;

    for (let row = top; row <= bottom; row += 1) {
      points.push({ row, col: right });
    }
    right -= 1;

    if (top <= bottom) {
      for (let col = right; col >= left; col -= 1) {
        points.push({ row: bottom, col });
      }
      bottom -= 1;
    }

    if (left <= right) {
      for (let row = bottom; row >= top; row -= 1) {
        points.push({ row, col: left });
      }
      left += 1;
    }
  }

  return points;
}

function getTraversal(seed: LevelSeed): Point[] {
  if (!("traversal" in seed)) {
    throw new Error(`Level ${seed.id} does not use a generated traversal.`);
  }

  let points =
    seed.traversal === "rows"
      ? snakeRows(seed.rows, seed.cols)
      : seed.traversal === "columns"
        ? snakeColumns(seed.rows, seed.cols)
        : spiral(seed.rows, seed.cols);

  if (seed.reverse) points = [...points].reverse();

  if (seed.offset) {
    const offset = seed.offset % points.length;
    points = [...points.slice(offset), ...points.slice(0, offset)];

    // A rotated list is only valid when its new seam stays adjacent.
    const seam = points.findIndex(
      (point, index) =>
        index > 0 &&
        Math.abs(point.row - points[index - 1].row) +
          Math.abs(point.col - points[index - 1].col) !==
          1
    );
    if (seam !== -1) {
      throw new Error(`Level ${seed.id} has a disconnected traversal seam.`);
    }
  }

  return points;
}

function createLevel(seed: LevelSeed): NumberlinkLevel {
  const cellCount = seed.rows * seed.cols;
  const paths =
    "paths" in seed
      ? seed.paths
      : (() => {
          const traversal = getTraversal(seed);
          const generatedPaths: Point[][] = [];
          let cursor = 0;

          seed.lengths.forEach((length) => {
            generatedPaths.push(traversal.slice(cursor, cursor + length));
            cursor += length;
          });

          return generatedPaths;
        })();
  const declaredCells = paths.reduce((total, path) => total + path.length, 0);

  if (declaredCells !== cellCount) {
    throw new Error(
      `Level ${seed.id} declares ${declaredCells} cells for a ${cellCount}-cell board.`
    );
  }

  const colors = FLOW_COLORS.slice(0, paths.length);
  const solution: PathMap = {};
  const endpoints: NumberlinkLevel["endpoints"] = {};

  paths.forEach((path, index) => {
    const color = colors[index];
    solution[color.id] = path;
    endpoints[color.id] = [path[0], path[path.length - 1]];
  });

  return {
    id: seed.id,
    chapter: 1,
    chapterTitle: "数连",
    mode: "numberlink",
    title: seed.title,
    difficulty: seed.difficulty,
    rows: seed.rows,
    cols: seed.cols,
    colors,
    endpoints,
    solution
  };
}

const LEVEL_SEEDS: LevelSeed[] = [
  {
    id: 1,
    title: "起点",
    difficulty: "入门",
    rows: 4,
    cols: 4,
    traversal: "rows",
    lengths: [8, 8]
  },
  {
    id: 2,
    title: "转角",
    difficulty: "入门",
    rows: 4,
    cols: 4,
    traversal: "columns",
    lengths: [5, 5, 6],
    reverse: true
  },
  {
    id: 3,
    title: "绕行",
    difficulty: "简单",
    rows: 5,
    cols: 5,
    traversal: "spiral",
    lengths: [8, 9, 8]
  },
  {
    id: 4,
    title: "交错",
    difficulty: "简单",
    rows: 5,
    cols: 5,
    traversal: "rows",
    lengths: [6, 6, 7, 6],
    reverse: true
  },
  {
    id: 5,
    title: "狭道",
    difficulty: "进阶",
    rows: 6,
    cols: 6,
    traversal: "spiral",
    lengths: [9, 8, 10, 9]
  },
  {
    id: 6,
    title: "分流",
    difficulty: "进阶",
    rows: 6,
    cols: 6,
    traversal: "columns",
    lengths: [7, 7, 8, 7, 7]
  },
  {
    id: 7,
    title: "围城",
    difficulty: "困难",
    rows: 6,
    cols: 6,
    // Unique solution; offline solver search score: 687.
    paths: [
      [
        { row: 0, col: 5 },
        { row: 0, col: 4 },
        { row: 0, col: 3 },
        { row: 0, col: 2 },
        { row: 0, col: 1 },
        { row: 0, col: 0 },
        { row: 1, col: 0 },
        { row: 2, col: 0 }
      ],
      [
        { row: 2, col: 2 },
        { row: 2, col: 3 },
        { row: 2, col: 4 },
        { row: 3, col: 4 },
        { row: 4, col: 4 },
        { row: 4, col: 3 },
        { row: 5, col: 3 },
        { row: 5, col: 2 },
        { row: 5, col: 1 },
        { row: 5, col: 0 }
      ],
      [
        { row: 3, col: 0 },
        { row: 4, col: 0 },
        { row: 4, col: 1 },
        { row: 4, col: 2 }
      ],
      [
        { row: 3, col: 3 },
        { row: 3, col: 2 },
        { row: 3, col: 1 },
        { row: 2, col: 1 },
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 1, col: 3 },
        { row: 1, col: 4 },
        { row: 1, col: 5 },
        { row: 2, col: 5 },
        { row: 3, col: 5 },
        { row: 4, col: 5 },
        { row: 5, col: 5 },
        { row: 5, col: 4 }
      ]
    ]
  },
  {
    id: 8,
    title: "错位",
    difficulty: "困难",
    rows: 7,
    cols: 7,
    // Unique solution; offline solver search score: 2,221.
    paths: [
      [
        { row: 0, col: 1 },
        { row: 0, col: 0 },
        { row: 1, col: 0 },
        { row: 2, col: 0 },
        { row: 3, col: 0 },
        { row: 4, col: 0 },
        { row: 5, col: 0 },
        { row: 6, col: 0 }
      ],
      [
        { row: 1, col: 1 },
        { row: 1, col: 2 },
        { row: 0, col: 2 },
        { row: 0, col: 3 },
        { row: 0, col: 4 },
        { row: 0, col: 5 },
        { row: 0, col: 6 },
        { row: 1, col: 6 },
        { row: 2, col: 6 },
        { row: 3, col: 6 }
      ],
      [
        { row: 1, col: 3 },
        { row: 1, col: 4 },
        { row: 1, col: 5 },
        { row: 2, col: 5 },
        { row: 3, col: 5 },
        { row: 4, col: 5 },
        { row: 5, col: 5 },
        { row: 5, col: 4 }
      ],
      [
        { row: 3, col: 3 },
        { row: 3, col: 2 },
        { row: 4, col: 2 },
        { row: 5, col: 2 },
        { row: 5, col: 3 },
        { row: 6, col: 3 },
        { row: 6, col: 4 },
        { row: 6, col: 5 },
        { row: 6, col: 6 },
        { row: 5, col: 6 },
        { row: 4, col: 6 }
      ],
      [
        { row: 4, col: 3 },
        { row: 4, col: 4 },
        { row: 3, col: 4 },
        { row: 2, col: 4 },
        { row: 2, col: 3 },
        { row: 2, col: 2 },
        { row: 2, col: 1 },
        { row: 3, col: 1 },
        { row: 4, col: 1 },
        { row: 5, col: 1 },
        { row: 6, col: 1 },
        { row: 6, col: 2 }
      ]
    ]
  },
  {
    id: 9,
    title: "锁链",
    difficulty: "专家",
    rows: 7,
    cols: 7,
    // Unique solution; offline solver search score: 3,519.
    paths: [
      [
        { row: 0, col: 4 },
        { row: 0, col: 5 },
        { row: 0, col: 6 },
        { row: 1, col: 6 },
        { row: 2, col: 6 },
        { row: 3, col: 6 },
        { row: 4, col: 6 },
        { row: 5, col: 6 },
        { row: 6, col: 6 },
        { row: 6, col: 5 }
      ],
      [
        { row: 1, col: 2 },
        { row: 1, col: 1 },
        { row: 2, col: 1 },
        { row: 3, col: 1 },
        { row: 3, col: 2 },
        { row: 3, col: 3 }
      ],
      [
        { row: 2, col: 2 },
        { row: 2, col: 3 },
        { row: 2, col: 4 },
        { row: 3, col: 4 },
        { row: 4, col: 4 },
        { row: 4, col: 3 },
        { row: 4, col: 2 }
      ],
      [
        { row: 4, col: 1 },
        { row: 5, col: 1 },
        { row: 5, col: 2 },
        { row: 5, col: 3 },
        { row: 6, col: 3 },
        { row: 6, col: 4 }
      ],
      [
        { row: 5, col: 4 },
        { row: 5, col: 5 },
        { row: 4, col: 5 },
        { row: 3, col: 5 },
        { row: 2, col: 5 },
        { row: 1, col: 5 },
        { row: 1, col: 4 },
        { row: 1, col: 3 },
        { row: 0, col: 3 },
        { row: 0, col: 2 },
        { row: 0, col: 1 },
        { row: 0, col: 0 },
        { row: 1, col: 0 },
        { row: 2, col: 0 },
        { row: 3, col: 0 },
        { row: 4, col: 0 },
        { row: 5, col: 0 },
        { row: 6, col: 0 },
        { row: 6, col: 1 },
        { row: 6, col: 2 }
      ]
    ]
  },
  {
    id: 10,
    title: "终局",
    difficulty: "极限",
    rows: 7,
    cols: 7,
    // Unique solution; offline solver search score: 8,081.
    paths: [
      [
        { row: 0, col: 5 },
        { row: 0, col: 4 },
        { row: 0, col: 3 },
        { row: 0, col: 2 },
        { row: 0, col: 1 },
        { row: 0, col: 0 },
        { row: 1, col: 0 }
      ],
      [
        { row: 0, col: 6 },
        { row: 1, col: 6 },
        { row: 1, col: 5 },
        { row: 1, col: 4 },
        { row: 1, col: 3 },
        { row: 1, col: 2 },
        { row: 1, col: 1 },
        { row: 2, col: 1 },
        { row: 3, col: 1 },
        { row: 4, col: 1 },
        { row: 5, col: 1 },
        { row: 5, col: 2 },
        { row: 5, col: 3 }
      ],
      [
        { row: 2, col: 0 },
        { row: 3, col: 0 },
        { row: 4, col: 0 }
      ],
      [
        { row: 3, col: 3 },
        { row: 3, col: 4 },
        { row: 3, col: 5 },
        { row: 4, col: 5 },
        { row: 5, col: 5 },
        { row: 5, col: 4 },
        { row: 6, col: 4 },
        { row: 6, col: 3 },
        { row: 6, col: 2 },
        { row: 6, col: 1 },
        { row: 6, col: 0 },
        { row: 5, col: 0 }
      ],
      [
        { row: 4, col: 4 },
        { row: 4, col: 3 },
        { row: 4, col: 2 },
        { row: 3, col: 2 },
        { row: 2, col: 2 },
        { row: 2, col: 3 },
        { row: 2, col: 4 },
        { row: 2, col: 5 },
        { row: 2, col: 6 },
        { row: 3, col: 6 },
        { row: 4, col: 6 },
        { row: 5, col: 6 },
        { row: 6, col: 6 },
        { row: 6, col: 5 }
      ]
    ]
  }
];

export const NUMBERLINK_LEVELS = LEVEL_SEEDS.map(createLevel);
