import {
  FLOW_COLORS,
  type NumberlinkLevel,
  type PathMap,
  type Point
} from "./game";

type NumberEndSeed = {
  id: number;
  title: string;
  difficulty: string;
  rows: number;
  cols: number;
  paths: Point[][];
};

const path = (...cells: Array<[number, number]>): Point[] =>
  cells.map(([row, col]) => ({ row, col }));

function createNumberEndLevel(seed: NumberEndSeed): NumberlinkLevel {
  const colors = FLOW_COLORS.slice(0, seed.paths.length);
  const solution: PathMap = {};
  const endpoints: NumberlinkLevel["endpoints"] = {};
  const targetLengths: Record<string, number> = {};

  seed.paths.forEach((points, index) => {
    const color = colors[index];
    solution[color.id] = points;
    endpoints[color.id] = [points[0], points[points.length - 1]];
    targetLengths[color.id] = points.length;
  });

  return {
    id: seed.id,
    chapter: 2,
    chapterTitle: "定长数连",
    mode: "number-end",
    title: seed.title,
    difficulty: seed.difficulty,
    rows: seed.rows,
    cols: seed.cols,
    colors,
    endpoints,
    targetLengths,
    solution
  };
}

const NUMBER_END_SEEDS: NumberEndSeed[] = [
  {
    id: 11,
    title: "数清格子",
    difficulty: "入门",
    rows: 4,
    cols: 4,
    paths: [
      path(
        [1, 1], [0, 1], [0, 0], [1, 0], [2, 0], [3, 0]
      ),
      path(
        [3, 1], [2, 1], [2, 2], [3, 2], [3, 3],
        [2, 3], [1, 3], [1, 2], [0, 2], [0, 3]
      )
    ]
  },
  {
    id: 12,
    title: "长短分流",
    difficulty: "简单",
    rows: 5,
    cols: 5,
    paths: [
      path([2, 2], [1, 2], [0, 2], [0, 3], [0, 4]),
      path(
        [1, 4], [1, 3], [2, 3], [2, 4], [3, 4],
        [4, 4], [4, 3], [3, 3], [3, 2]
      ),
      path(
        [4, 2], [4, 1], [4, 0], [3, 0], [3, 1], [2, 1],
        [2, 0], [1, 0], [1, 1], [0, 1], [0, 0]
      )
    ]
  },
  {
    id: 13,
    title: "精确转弯",
    difficulty: "简单",
    rows: 5,
    cols: 5,
    paths: [
      path([0, 0], [0, 1], [0, 2]),
      path([0, 3], [0, 4], [1, 4], [1, 3], [1, 2], [1, 1]),
      path(
        [1, 0], [2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [3, 4]
      ),
      path(
        [3, 3], [3, 2], [3, 1], [3, 0], [4, 0],
        [4, 1], [4, 2], [4, 3], [4, 4]
      )
    ]
  },
  {
    id: 14,
    title: "长度接力",
    difficulty: "进阶",
    rows: 6,
    cols: 6,
    paths: [
      path([0, 0], [0, 1], [0, 2], [0, 3], [0, 4]),
      path(
        [0, 5], [1, 5], [1, 4], [1, 3],
        [1, 2], [1, 1], [1, 0], [2, 0]
      ),
      path(
        [2, 1], [2, 2], [2, 3], [2, 4], [2, 5],
        [3, 5], [3, 4], [3, 3], [3, 2], [3, 1]
      ),
      path(
        [3, 0], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5],
        [5, 5], [5, 4], [5, 3], [5, 2], [5, 1], [5, 0]
      )
    ]
  },
  {
    id: 15,
    title: "内外交错",
    difficulty: "进阶",
    rows: 6,
    cols: 6,
    paths: [
      path(
        [1, 1], [0, 1], [0, 0], [1, 0],
        [2, 0], [3, 0], [4, 0], [5, 0]
      ),
      path([5, 1], [4, 1], [3, 1], [2, 1], [2, 2]),
      path(
        [1, 2], [0, 2], [0, 3], [1, 3], [2, 3],
        [3, 3], [3, 2], [4, 2], [5, 2], [5, 3]
      ),
      path([4, 3], [4, 4], [5, 4], [5, 5]),
      path(
        [4, 5], [3, 5], [3, 4], [2, 4], [2, 5],
        [1, 5], [0, 5], [0, 4], [1, 4]
      )
    ]
  },
  {
    id: 16,
    title: "余量陷阱",
    difficulty: "困难",
    rows: 6,
    cols: 6,
    paths: [
      path(
        [3, 2], [2, 2], [2, 3], [3, 3], [4, 3],
        [5, 3], [5, 4], [5, 5], [4, 5], [4, 4]
      ),
      path([3, 4], [3, 5], [2, 5], [2, 4], [1, 4], [1, 5]),
      path([0, 5], [0, 4], [0, 3], [1, 3], [1, 2], [0, 2], [0, 1]),
      path(
        [0, 0], [1, 0], [1, 1], [2, 1], [2, 0],
        [3, 0], [3, 1], [4, 1], [4, 0]
      ),
      path([5, 0], [5, 1], [5, 2], [4, 2])
    ]
  },
  {
    id: 17,
    title: "剩余面积",
    difficulty: "专家",
    rows: 7,
    cols: 7,
    paths: [
      path(
        [0, 2], [0, 1], [0, 0], [1, 0], [2, 0], [2, 1],
        [2, 2], [2, 3], [2, 4], [3, 4], [4, 4], [4, 3]
      ),
      path(
        [0, 3], [0, 4], [0, 5], [0, 6], [1, 6], [2, 6],
        [3, 6], [4, 6], [5, 6], [6, 6], [6, 5]
      ),
      path(
        [1, 1], [1, 2], [1, 3], [1, 4], [1, 5],
        [2, 5], [3, 5], [4, 5], [5, 5], [5, 4],
        [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
        [5, 0], [4, 0], [3, 0], [3, 1]
      ),
      path([3, 3], [3, 2], [4, 2], [4, 1]),
      path([5, 1], [5, 2], [5, 3])
    ]
  },
  {
    id: 18,
    title: "定长终局",
    difficulty: "极限",
    rows: 7,
    cols: 7,
    paths: [
      path([0, 1], [0, 0], [1, 0]),
      path(
        [0, 2], [0, 3], [0, 4], [0, 5], [1, 5],
        [2, 5], [2, 4], [2, 3], [2, 2], [3, 2],
        [4, 2], [4, 3], [4, 4], [4, 5], [4, 6],
        [5, 6], [6, 6], [6, 5], [6, 4]
      ),
      path(
        [0, 6], [1, 6], [2, 6], [3, 6], [3, 5], [3, 4], [3, 3]
      ),
      path(
        [1, 4], [1, 3], [1, 2], [1, 1], [2, 1],
        [3, 1], [4, 1], [5, 1], [5, 2]
      ),
      path([2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [6, 1]),
      path([5, 5], [5, 4], [5, 3], [6, 3], [6, 2])
    ]
  }
];

export const NUMBER_END_LEVELS = NUMBER_END_SEEDS.map(createNumberEndLevel);
