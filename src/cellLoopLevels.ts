import {
  type CellEdgeKey,
  type CellLoopLevel
} from "./cellLoop";
import { PIPELINK_LEVELS } from "./pipelinkLevels";

type MasyuLevelSeed = {
  id: number;
  title: string;
  difficulty: string;
  rows: number;
  cols: number;
  clues: Array<[number, number, "white" | "black"]>;
  solutionEdges: string;
};

const MASYU_LEVEL_SEEDS: MasyuLevelSeed[] = [
  {
    id: 61,
    title: "白珠入门",
    difficulty: "入门",
    rows: 4,
    cols: 4,
    clues: [
      [1, 0, "white"],
      [1, 2, "white"],
      [2, 1, "white"],
      [2, 3, "white"]
    ],
    solutionEdges:
      "ch:1:1 ch:1:2 cv:1:3 cv:2:3 ch:3:2 cv:2:2 ch:2:1 ch:2:0 cv:1:0 cv:0:0 ch:0:0 cv:0:1"
  },
  {
    id: 62,
    title: "黑珠转角",
    difficulty: "入门",
    rows: 5,
    cols: 5,
    clues: [
      [0, 2, "black"],
      [2, 4, "black"],
      [3, 1, "black"]
    ],
    solutionEdges:
      "ch:1:0 cv:0:0 ch:0:0 ch:0:1 cv:0:2 cv:1:2 ch:2:2 ch:2:3 cv:2:4 cv:3:4 ch:4:3 cv:3:3 ch:3:2 ch:3:1 cv:2:1 cv:1:1"
  },
  {
    id: 63,
    title: "黑白牵引",
    difficulty: "简单",
    rows: 5,
    cols: 5,
    clues: [
      [1, 1, "black"],
      [1, 2, "white"],
      [2, 2, "black"],
      [2, 3, "white"],
      [2, 4, "black"],
      [3, 2, "white"],
      [4, 2, "black"]
    ],
    solutionEdges:
      "ch:1:1 ch:1:2 cv:0:3 ch:0:3 cv:0:4 cv:1:4 ch:2:3 ch:2:2 cv:2:2 cv:3:2 ch:4:1 ch:4:0 cv:3:0 ch:3:0 cv:2:1 cv:1:1"
  },
  {
    id: 64,
    title: "相邻黑珠",
    difficulty: "简单",
    rows: 6,
    cols: 6,
    clues: [
      [1, 1, "white"],
      [2, 1, "white"],
      [2, 3, "black"],
      [2, 4, "white"],
      [3, 2, "black"],
      [3, 3, "black"],
      [4, 2, "white"]
    ],
    solutionEdges:
      "cv:1:2 ch:1:1 ch:1:0 cv:0:0 ch:0:0 ch:0:1 ch:0:2 cv:0:3 cv:1:3 ch:2:3 ch:2:4 cv:2:5 ch:3:4 ch:3:3 cv:3:3 cv:4:3 ch:5:2 cv:4:2 cv:3:2 ch:3:1 ch:3:0 cv:2:0 ch:2:0 ch:2:1"
  },
  {
    id: 65,
    title: "三白成列",
    difficulty: "进阶",
    rows: 6,
    cols: 6,
    clues: [
      [1, 1, "white"],
      [1, 2, "white"],
      [1, 3, "white"],
      [2, 4, "white"],
      [3, 2, "black"],
      [3, 5, "white"],
      [4, 1, "white"],
      [5, 5, "black"]
    ],
    solutionEdges:
      "cv:1:2 cv:0:2 ch:0:2 cv:0:3 cv:1:3 ch:2:3 ch:2:4 cv:2:5 cv:3:5 cv:4:5 ch:5:4 ch:5:3 cv:4:3 ch:4:3 cv:3:4 ch:3:3 ch:3:2 cv:3:2 cv:4:2 ch:5:1 cv:4:1 cv:3:1 ch:3:0 cv:2:0 cv:1:0 cv:0:0 ch:0:0 cv:0:1 cv:1:1 ch:2:1"
  },
  {
    id: 66,
    title: "回路取舍",
    difficulty: "困难",
    rows: 6,
    cols: 6,
    clues: [
      [1, 2, "white"],
      [1, 3, "white"],
      [2, 2, "black"],
      [3, 1, "white"],
      [3, 3, "black"],
      [3, 4, "white"],
      [4, 1, "white"],
      [4, 4, "white"]
    ],
    solutionEdges:
      "ch:2:1 cv:1:2 cv:0:2 ch:0:2 cv:0:3 cv:1:3 cv:2:3 ch:3:3 ch:3:4 cv:3:5 ch:4:4 ch:4:3 cv:4:3 ch:5:2 ch:5:1 ch:5:0 cv:4:0 ch:4:0 ch:4:1 cv:3:2 ch:3:1 ch:3:0 cv:2:0 ch:2:0"
  },
  {
    id: 67,
    title: "稀珠长链",
    difficulty: "专家",
    rows: 7,
    cols: 7,
    clues: [
      [1, 5, "black"],
      [2, 2, "black"],
      [3, 1, "white"],
      [3, 3, "black"],
      [3, 5, "white"],
      [4, 1, "white"],
      [4, 2, "black"],
      [6, 4, "white"]
    ],
    solutionEdges:
      "cv:3:4 cv:2:4 ch:2:3 ch:2:2 cv:1:2 cv:0:2 ch:0:2 cv:0:3 ch:1:3 ch:1:4 cv:1:5 cv:2:5 cv:3:5 ch:4:5 cv:4:6 ch:5:5 cv:5:5 ch:6:4 ch:6:3 ch:6:2 cv:5:2 cv:4:2 ch:4:1 ch:4:0 cv:3:0 ch:3:0 ch:3:1 ch:3:2 cv:3:3 cv:4:3 ch:5:3 cv:4:4"
  },
  {
    id: 68,
    title: "珍珠终局",
    difficulty: "极限",
    rows: 8,
    cols: 8,
    clues: [
      [1, 4, "white"],
      [1, 5, "white"],
      [2, 1, "white"],
      [2, 2, "white"],
      [2, 3, "black"],
      [2, 4, "white"],
      [2, 5, "black"],
      [3, 1, "white"],
      [5, 1, "white"],
      [5, 2, "white"],
      [5, 5, "white"],
      [5, 7, "white"],
      [6, 1, "white"],
      [6, 7, "white"],
      [7, 4, "white"]
    ],
    solutionEdges:
      "ch:4:4 cv:3:5 ch:3:4 cv:2:4 cv:1:4 cv:0:4 ch:0:4 cv:0:5 cv:1:5 ch:2:5 ch:2:6 cv:2:7 ch:3:6 cv:3:6 ch:4:6 cv:4:7 cv:5:7 cv:6:7 ch:7:6 cv:6:6 cv:5:6 ch:5:5 ch:5:4 cv:5:4 ch:6:4 cv:6:5 ch:7:4 ch:7:3 ch:7:2 ch:7:1 ch:7:0 cv:6:0 ch:6:0 ch:6:1 ch:6:2 cv:5:3 ch:5:2 ch:5:1 ch:5:0 cv:4:0 ch:4:0 ch:4:1 cv:3:2 ch:3:1 ch:3:0 cv:2:0 ch:2:0 ch:2:1 ch:2:2 cv:2:3 cv:3:3 ch:4:3"
  }
];

function createMasyuLevel(seed: MasyuLevelSeed): CellLoopLevel {
  return {
    id: seed.id,
    chapter: 8,
    chapterTitle: "珍珠",
    mode: "masyu",
    title: seed.title,
    difficulty: seed.difficulty,
    rows: seed.rows,
    cols: seed.cols,
    colors: [],
    endpoints: {},
    solution: {},
    blockedCells: [],
    prefilledEdges: [],
    loopClues: seed.clues.map(([row, col, kind]) => ({ row, col, kind })),
    solutionEdges: seed.solutionEdges.split(" ") as CellEdgeKey[]
  };
}

type GeradewegLevelSeed = {
  title: string;
  difficulty: string;
  size: number;
  clues: Array<[number, number, number]>;
  solutionEdges: string;
};

const GERADEWEG_LEVEL_SEEDS: GeradewegLevelSeed[] = [
  {
    title: "整段入门",
    difficulty: "入门",
    size: 5,
    clues: [
      [1, 1, 3],
      [2, 1, 2],
      [3, 2, 2],
      [3, 3, 2]
    ],
    solutionEdges:
      "ch:1:1 ch:1:2 cv:0:3 ch:0:3 cv:0:4 cv:1:4 ch:2:3 cv:2:3 cv:3:3 ch:4:2 cv:3:2 cv:2:2 ch:2:1 ch:2:0 cv:1:0 ch:1:0"
  },
  {
    title: "同段双数",
    difficulty: "入门",
    size: 5,
    clues: [
      [1, 1, 2],
      [1, 2, 3],
      [3, 4, 2],
      [4, 2, 3],
      [4, 3, 3]
    ],
    solutionEdges:
      "cv:1:1 cv:0:1 ch:0:1 cv:0:2 cv:1:2 cv:2:2 ch:3:2 cv:2:3 ch:2:3 cv:2:4 cv:3:4 ch:4:3 ch:4:2 ch:4:1 cv:3:1 ch:3:0 cv:2:0 ch:2:0"
  },
  {
    title: "转角双臂",
    difficulty: "简单",
    size: 6,
    clues: [
      [1, 0, 1],
      [2, 1, 1],
      [2, 5, 1],
      [3, 3, 2],
      [4, 1, 1],
      [5, 2, 1],
      [5, 4, 1]
    ],
    solutionEdges:
      "ch:1:2 cv:1:2 ch:2:1 cv:1:1 ch:1:0 cv:0:0 ch:0:0 ch:0:1 ch:0:2 ch:0:3 cv:0:4 ch:1:4 cv:1:5 ch:2:4 cv:2:4 ch:3:4 cv:3:5 cv:4:5 ch:5:4 cv:4:4 ch:4:3 cv:4:3 ch:5:2 cv:4:2 ch:4:1 cv:3:1 ch:3:1 ch:3:2 cv:2:3 cv:1:3"
  },
  {
    title: "直角交错",
    difficulty: "简单",
    size: 6,
    clues: [
      [0, 1, 4],
      [1, 2, 2],
      [1, 5, 1],
      [2, 1, 1],
      [4, 3, 2],
      [4, 4, 3]
    ],
    solutionEdges:
      "ch:1:2 ch:1:1 cv:1:1 ch:2:0 cv:1:0 cv:0:0 ch:0:0 ch:0:1 ch:0:2 ch:0:3 cv:0:4 ch:1:4 cv:1:5 ch:2:4 cv:2:4 cv:3:4 cv:4:4 ch:5:3 cv:4:3 cv:3:3 ch:3:2 cv:2:2 ch:2:2 cv:1:3"
  },
  {
    title: "边界长尺",
    difficulty: "进阶",
    size: 7,
    clues: [
      [0, 2, 3],
      [1, 1, 1],
      [1, 4, 1],
      [2, 2, 1],
      [2, 5, 3],
      [3, 3, 1],
      [3, 6, 4],
      [4, 2, 1],
      [5, 0, 1],
      [6, 3, 1]
    ],
    solutionEdges:
      "cv:3:2 ch:3:1 cv:2:1 ch:2:1 cv:1:2 ch:1:1 cv:0:1 ch:0:1 ch:0:2 ch:0:3 cv:0:4 ch:1:3 cv:1:3 ch:2:3 cv:2:4 ch:3:3 cv:3:3 ch:4:3 ch:4:4 cv:3:5 cv:2:5 cv:1:5 ch:1:5 cv:1:6 cv:2:6 cv:3:6 cv:4:6 ch:5:5 ch:5:4 cv:5:4 ch:6:3 cv:5:3 ch:5:2 cv:5:2 ch:6:1 ch:6:0 cv:5:0 ch:5:0 cv:4:1 ch:4:1"
  },
  {
    title: "长短牵制",
    difficulty: "困难",
    size: 7,
    clues: [
      [0, 1, 1],
      [0, 5, 1],
      [1, 0, 1],
      [1, 6, 1],
      [2, 5, 1],
      [3, 3, 4],
      [4, 1, 2],
      [5, 2, 2],
      [5, 4, 2],
      [5, 6, 1]
    ],
    solutionEdges:
      "ch:3:3 cv:2:4 ch:2:3 ch:2:2 ch:2:1 ch:2:0 cv:1:0 ch:1:0 cv:0:1 ch:0:1 cv:0:2 ch:1:2 ch:1:3 cv:0:4 ch:0:4 cv:0:5 ch:1:5 cv:1:6 ch:2:5 cv:2:5 ch:3:5 cv:3:6 ch:4:5 cv:4:5 ch:5:5 cv:5:6 ch:6:5 ch:6:4 cv:5:4 cv:4:4 ch:4:3 cv:4:3 cv:5:3 ch:6:2 cv:5:2 cv:4:2 ch:4:1 ch:4:0 cv:3:0 ch:3:0 ch:3:1 ch:3:2"
  },
  {
    title: "稀数闭环",
    difficulty: "专家",
    size: 7,
    clues: [
      [0, 1, 3],
      [1, 5, 2],
      [2, 2, 1],
      [3, 4, 3],
      [4, 3, 1],
      [4, 4, 2],
      [6, 2, 3]
    ],
    solutionEdges:
      "ch:1:1 ch:1:0 cv:0:0 ch:0:0 ch:0:1 ch:0:2 cv:0:3 ch:1:3 cv:0:4 ch:0:4 cv:0:5 cv:1:5 ch:2:4 ch:2:3 cv:2:3 ch:3:3 ch:3:4 ch:3:5 cv:3:6 ch:4:5 ch:4:4 cv:4:4 cv:5:4 ch:6:3 ch:6:2 ch:6:1 cv:5:1 ch:5:1 ch:5:2 cv:4:3 ch:4:2 cv:3:2 ch:3:1 cv:2:1 ch:2:1 cv:1:2"
  },
  {
    title: "直线终局",
    difficulty: "极限",
    size: 7,
    clues: [
      [1, 3, 1],
      [2, 2, 1],
      [2, 4, 1],
      [3, 1, 1],
      [3, 3, 3],
      [3, 6, 2],
      [5, 1, 2],
      [5, 5, 1],
      [6, 2, 1]
    ],
    solutionEdges:
      "ch:4:2 ch:4:3 cv:4:4 ch:5:4 cv:5:5 ch:6:4 ch:6:3 cv:5:3 ch:5:2 cv:5:2 ch:6:1 cv:5:1 cv:4:1 ch:4:0 cv:3:0 ch:3:0 cv:2:1 ch:2:1 cv:1:2 ch:1:2 cv:1:3 ch:2:3 cv:1:4 ch:1:4 cv:1:5 ch:2:5 cv:2:6 cv:3:6 ch:4:5 cv:3:5 ch:3:4 ch:3:3 ch:3:2 cv:3:2"
  }
];

function createGeradewegLevel(
  seed: GeradewegLevelSeed,
  offset: number
): CellLoopLevel {
  return {
    id: 85 + offset,
    chapter: 11,
    chapterTitle: "直线环路",
    mode: "geradeweg",
    title: seed.title,
    difficulty: seed.difficulty,
    rows: seed.size,
    cols: seed.size,
    colors: [],
    endpoints: {},
    solution: {},
    blockedCells: [],
    prefilledEdges: [],
    loopClues: seed.clues.map(([row, col, value]) => ({
      row,
      col,
      kind: "length",
      value
    })),
    solutionEdges: seed.solutionEdges.split(" ") as CellEdgeKey[]
  };
}

type MidloopClueSeed =
  | ["cell", number, number]
  | ["edge", CellEdgeKey];

type MidloopLevelSeed = {
  title: string;
  difficulty: string;
  size: number;
  clues: MidloopClueSeed[];
  solutionEdges: string;
};

const MIDLOOP_LEVEL_SEEDS: MidloopLevelSeed[] = [
  {
    title: "四点成环",
    difficulty: "入门",
    size: 3,
    clues: [
      ["cell", 0, 1],
      ["cell", 1, 0],
      ["cell", 1, 2],
      ["cell", 2, 1]
    ],
    solutionEdges:
      "ch:0:0 cv:0:0 ch:0:1 cv:0:2 cv:1:0 cv:1:2 ch:2:0 ch:2:1"
  },
  {
    title: "错位相邻",
    difficulty: "入门",
    size: 5,
    clues: [
      ["cell", 0, 3],
      ["edge", "ch:1:0"],
      ["cell", 2, 2],
      ["edge", "ch:3:0"],
      ["cell", 3, 3]
    ],
    solutionEdges:
      "ch:0:2 cv:0:2 ch:0:3 cv:0:4 ch:1:0 cv:1:0 cv:1:1 ch:1:2 cv:1:3 cv:1:4 cv:2:0 ch:2:1 ch:2:2 cv:2:4 ch:3:0 cv:3:1 ch:3:2 cv:3:2 ch:3:3 ch:4:1"
  },
  {
    title: "双向折返",
    difficulty: "简单",
    size: 6,
    clues: [
      ["cell", 0, 2],
      ["edge", "cv:0:4"],
      ["edge", "ch:1:0"],
      ["edge", "cv:1:1"],
      ["edge", "cv:1:2"],
      ["edge", "ch:1:4"],
      ["edge", "cv:1:5"],
      ["edge", "ch:2:1"],
      ["cell", 2, 3],
      ["cell", 4, 0],
      ["edge", "ch:4:1"],
      ["edge", "cv:4:2"],
      ["edge", "cv:4:4"],
      ["cell", 4, 5],
      ["edge", "ch:5:0"],
      ["edge", "cv:4:1"],
      ["edge", "ch:5:4"]
    ],
    solutionEdges:
      "ch:0:0 cv:0:0 ch:0:1 ch:0:2 ch:0:3 cv:0:4 ch:1:0 cv:1:1 ch:1:2 cv:1:2 cv:1:3 ch:1:4 cv:1:5 ch:2:1 cv:2:3 ch:2:4 cv:2:4 ch:3:0 cv:3:0 ch:3:1 ch:3:2 ch:3:4 cv:3:5 cv:4:0 ch:4:1 cv:4:1 cv:4:2 ch:4:3 cv:4:3 cv:4:4 cv:4:5 ch:5:0 ch:5:2 ch:5:4"
  },
  {
    title: "边点织网",
    difficulty: "简单",
    size: 6,
    clues: [
      ["edge", "cv:0:2"],
      ["cell", 0, 4],
      ["cell", 1, 0],
      ["edge", "ch:1:2"],
      ["cell", 2, 2],
      ["edge", "cv:2:4"],
      ["edge", "cv:2:5"],
      ["edge", "ch:3:2"],
      ["edge", "cv:4:0"],
      ["edge", "ch:4:3"],
      ["edge", "cv:4:4"],
      ["edge", "ch:5:1"],
      ["edge", "ch:5:4"]
    ],
    solutionEdges:
      "ch:0:0 cv:0:0 ch:0:1 cv:0:2 ch:0:3 cv:0:3 ch:0:4 cv:0:5 cv:1:0 ch:1:2 cv:1:5 ch:2:0 ch:2:1 ch:2:2 ch:2:3 cv:2:4 cv:2:5 ch:3:1 cv:3:1 ch:3:2 ch:3:3 cv:3:5 ch:4:0 cv:4:0 ch:4:3 cv:4:3 cv:4:4 cv:4:5 ch:5:0 ch:5:1 ch:5:2 ch:5:4"
  },
  {
    title: "交错牵制",
    difficulty: "进阶",
    size: 6,
    clues: [
      ["edge", "cv:0:2"],
      ["cell", 0, 3],
      ["edge", "cv:1:0"],
      ["cell", 1, 4],
      ["cell", 2, 2],
      ["edge", "ch:2:4"],
      ["edge", "cv:3:1"],
      ["cell", 3, 5],
      ["cell", 4, 4],
      ["cell", 5, 1]
    ],
    solutionEdges:
      "ch:0:0 cv:0:0 cv:0:1 ch:0:2 cv:0:2 ch:0:3 cv:0:4 cv:1:0 cv:1:1 ch:1:2 cv:1:3 cv:1:4 cv:2:0 ch:2:1 ch:2:2 ch:2:4 cv:2:5 ch:3:0 cv:3:1 ch:3:2 cv:3:2 cv:3:3 cv:3:5 ch:4:0 cv:4:0 cv:4:2 ch:4:3 ch:4:4 ch:5:0 ch:5:1"
  },
  {
    title: "闭环取舍",
    difficulty: "困难",
    size: 6,
    clues: [
      ["cell", 0, 3],
      ["edge", "ch:1:0"],
      ["cell", 1, 3],
      ["edge", "ch:2:0"],
      ["cell", 3, 1],
      ["cell", 3, 2],
      ["edge", "ch:4:0"],
      ["cell", 4, 3],
      ["cell", 5, 1],
      ["cell", 5, 4]
    ],
    solutionEdges:
      "ch:0:1 cv:0:1 ch:0:2 ch:0:3 ch:0:4 cv:0:5 ch:1:0 cv:1:0 ch:1:2 cv:1:2 ch:1:3 cv:1:4 cv:1:5 ch:2:0 cv:2:1 cv:2:2 cv:2:4 cv:2:5 cv:3:1 cv:3:2 ch:3:3 cv:3:3 cv:3:5 ch:4:0 cv:4:0 cv:4:2 cv:4:3 cv:4:5 ch:5:0 ch:5:1 ch:5:3 ch:5:4"
  },
  {
    title: "远距牵制",
    difficulty: "专家",
    size: 7,
    clues: [
      ["cell", 0, 1],
      ["edge", "cv:0:2"],
      ["edge", "ch:1:5"],
      ["cell", 2, 3],
      ["cell", 3, 0],
      ["cell", 3, 3],
      ["edge", "cv:3:6"],
      ["edge", "cv:4:1"],
      ["edge", "cv:4:5"],
      ["edge", "ch:6:1"]
    ],
    solutionEdges:
      "ch:0:0 cv:0:0 ch:0:1 cv:0:2 cv:1:0 ch:1:1 cv:1:1 ch:1:5 cv:1:5 cv:1:6 cv:2:0 ch:2:1 ch:2:2 ch:2:3 ch:2:4 cv:2:6 cv:3:0 ch:3:2 cv:3:2 ch:3:3 cv:3:4 cv:3:6 cv:4:0 ch:4:1 cv:4:1 ch:4:4 cv:4:5 cv:4:6 cv:5:0 ch:5:1 ch:5:2 cv:5:3 ch:5:4 cv:5:4 cv:5:6 ch:6:0 ch:6:1 ch:6:2 ch:6:4 ch:6:5"
  },
  {
    title: "八点终局",
    difficulty: "极限",
    size: 7,
    clues: [
      ["edge", "ch:0:1"],
      ["edge", "cv:1:2"],
      ["cell", 2, 1],
      ["cell", 2, 3],
      ["cell", 3, 1],
      ["edge", "cv:4:2"],
      ["edge", "cv:4:4"],
      ["edge", "cv:5:6"]
    ],
    solutionEdges:
      "ch:0:0 cv:0:0 ch:0:1 ch:0:2 cv:0:3 ch:1:0 ch:1:1 cv:1:2 cv:1:3 ch:2:0 cv:2:0 ch:2:1 cv:2:3 ch:3:0 ch:3:1 cv:3:2 cv:3:3 cv:4:2 ch:4:3 cv:4:4 cv:5:2 ch:5:4 ch:5:5 cv:5:6 ch:6:2 ch:6:3 ch:6:4 ch:6:5"
  }
];

function createMidloopLevel(
  seed: MidloopLevelSeed,
  offset: number
): CellLoopLevel {
  return {
    id: 69 + offset,
    chapter: 9,
    chapterTitle: "中环",
    mode: "midloop",
    title: seed.title,
    difficulty: seed.difficulty,
    rows: seed.size,
    cols: seed.size,
    colors: [],
    endpoints: {},
    solution: {},
    blockedCells: [],
    prefilledEdges: [],
    loopClues: seed.clues.map((clue) =>
      clue[0] === "cell"
        ? { row: clue[1], col: clue[2], kind: "mid-cell" }
        : { row: 0, col: 0, kind: "mid-edge", edge: clue[1] }
    ),
    solutionEdges: seed.solutionEdges.split(" ") as CellEdgeKey[]
  };
}

type BalanceLoopClueSeed = [
  number,
  number,
  "white" | "black",
  number?
];

type BalanceLoopLevelSeed = {
  title: string;
  difficulty: string;
  size: number;
  clues: BalanceLoopClueSeed[];
  solutionEdges: string;
};

const BALANCE_LOOP_LEVEL_SEEDS: BalanceLoopLevelSeed[] = [
  {
    title: "等臂初识",
    difficulty: "入门",
    size: 4,
    clues: [
      [0, 1, "white"],
      [0, 2, "white"],
      [1, 0, "white"],
      [1, 1, "white"],
      [1, 2, "white"],
      [1, 3, "white"],
      [2, 0, "white"],
      [2, 1, "white"],
      [2, 2, "white"],
      [2, 3, "white"],
      [3, 1, "white"],
      [3, 2, "white"]
    ],
    solutionEdges:
      "cv:0:1 ch:0:1 cv:0:2 ch:1:2 cv:1:3 ch:2:2 cv:2:2 ch:3:1 cv:2:1 ch:2:0 cv:1:0 ch:1:0"
  },
  {
    title: "白圈折臂",
    difficulty: "简单",
    size: 5,
    clues: [
      [1, 1, "white"],
      [1, 3, "white"],
      [2, 2, "white"],
      [3, 0, "white"],
      [3, 4, "white"],
      [4, 1, "white"],
      [4, 2, "white"]
    ],
    solutionEdges:
      "cv:1:1 ch:1:1 cv:1:2 ch:2:2 cv:1:3 ch:1:3 cv:1:4 cv:2:4 ch:3:3 ch:3:2 cv:3:2 ch:4:1 cv:3:1 ch:3:0 cv:2:0 ch:2:0"
  },
  {
    title: "黑圈失衡",
    difficulty: "简单",
    size: 5,
    clues: [
      [0, 1, "white"],
      [0, 2, "white"],
      [2, 0, "black"],
      [2, 1, "white"],
      [2, 3, "white"],
      [2, 4, "black"],
      [3, 4, "white"],
      [4, 1, "white"]
    ],
    solutionEdges:
      "ch:2:2 ch:2:3 cv:2:4 ch:3:3 cv:3:3 ch:4:2 cv:3:2 ch:3:1 cv:3:1 ch:4:0 cv:3:0 cv:2:0 ch:2:0 cv:1:1 ch:1:0 cv:0:0 ch:0:0 ch:0:1 cv:0:2 cv:1:2"
  },
  {
    title: "黑白牵制",
    difficulty: "进阶",
    size: 5,
    clues: [
      [0, 1, "white"],
      [1, 4, "black"],
      [2, 0, "black"],
      [2, 2, "white"],
      [2, 3, "white"],
      [2, 4, "white"],
      [3, 2, "white"],
      [4, 1, "black"]
    ],
    solutionEdges:
      "cv:0:1 ch:0:1 cv:0:2 ch:1:2 ch:1:3 cv:1:4 ch:2:3 cv:2:3 ch:3:2 cv:2:2 ch:2:1 cv:2:1 cv:3:1 ch:4:0 cv:3:0 cv:2:0 cv:1:0 ch:1:0"
  },
  {
    title: "长度刻度",
    difficulty: "进阶",
    size: 6,
    clues: [
      [1, 0, "white", 2],
      [1, 3, "white", 2],
      [2, 2, "white", 2],
      [2, 5, "white", 2],
      [3, 1, "white", 2],
      [3, 3, "white", 2],
      [5, 2, "white", 4],
      [5, 3, "white", 2]
    ],
    solutionEdges:
      "cv:0:3 ch:0:3 cv:0:4 ch:1:4 cv:1:5 ch:2:4 cv:2:4 ch:3:3 cv:3:3 ch:4:3 cv:4:4 ch:5:3 ch:5:2 cv:4:2 cv:3:2 ch:3:1 cv:2:1 ch:2:0 cv:1:0 cv:0:0 ch:0:0 cv:0:1 ch:1:1 cv:1:2 ch:2:2 cv:1:3"
  },
  {
    title: "奇偶拆分",
    difficulty: "困难",
    size: 6,
    clues: [
      [0, 1, "black", 3],
      [2, 1, "black", 3],
      [2, 3, "white", 4],
      [2, 4, "white", 2],
      [3, 4, "black", 3],
      [5, 1, "black", 3],
      [5, 4, "white", 2]
    ],
    solutionEdges:
      "cv:1:2 cv:0:2 ch:0:2 cv:0:3 cv:1:3 ch:2:3 ch:2:4 cv:2:5 cv:3:5 cv:4:5 ch:5:4 ch:5:3 cv:4:3 ch:4:3 cv:3:4 ch:3:3 ch:3:2 cv:3:2 cv:4:2 ch:5:1 cv:4:1 cv:3:1 ch:3:0 cv:2:0 cv:1:0 cv:0:0 ch:0:0 cv:0:1 cv:1:1 ch:2:1"
  },
  {
    title: "数字交锁",
    difficulty: "专家",
    size: 7,
    clues: [
      [0, 3, "black", 3],
      [0, 4, "white", 2],
      [1, 2, "white", 2],
      [1, 4, "black", 3],
      [2, 1, "black", 3],
      [3, 0, "black", 4],
      [3, 4, "white", 2],
      [3, 6, "black", 3],
      [4, 2, "white", 2],
      [4, 6, "white", 2],
      [5, 6, "black", 3],
      [6, 3, "white", 2]
    ],
    solutionEdges:
      "ch:3:2 ch:3:1 ch:3:0 cv:2:0 ch:2:0 cv:1:1 cv:0:1 ch:0:1 cv:0:2 cv:1:2 ch:2:2 cv:1:3 cv:0:3 ch:0:3 cv:0:4 ch:1:4 ch:1:5 cv:1:6 ch:2:5 ch:2:4 cv:2:4 cv:3:4 ch:4:4 cv:3:5 ch:3:5 cv:3:6 cv:4:6 ch:5:5 cv:5:5 ch:6:4 cv:5:4 ch:5:3 cv:5:3 ch:6:2 cv:5:2 ch:5:1 cv:4:1 ch:4:1 ch:4:2 cv:3:3"
  },
  {
    title: "平衡终局",
    difficulty: "极限",
    size: 7,
    clues: [
      [0, 3, "white", 2],
      [1, 3, "black", 3],
      [2, 3, "white"],
      [3, 1, "black"],
      [3, 2, "black"],
      [3, 5, "black", 3],
      [4, 2, "white"],
      [4, 4, "black", 3],
      [5, 2, "white"],
      [5, 3, "black", 3],
      [5, 4, "black"],
      [5, 6, "white"],
      [6, 4, "black"]
    ],
    solutionEdges:
      "cv:3:4 cv:2:4 ch:2:3 ch:2:2 cv:1:2 cv:0:2 ch:0:2 cv:0:3 ch:1:3 ch:1:4 cv:1:5 cv:2:5 cv:3:5 ch:4:5 cv:4:6 ch:5:5 cv:5:5 ch:6:4 ch:6:3 ch:6:2 cv:5:2 cv:4:2 ch:4:1 ch:4:0 cv:3:0 ch:3:0 ch:3:1 ch:3:2 cv:3:3 cv:4:3 ch:5:3 cv:4:4"
  }
];

function createBalanceLoopLevel(
  seed: BalanceLoopLevelSeed,
  offset: number
): CellLoopLevel {
  return {
    id: 77 + offset,
    chapter: 10,
    chapterTitle: "平衡环",
    mode: "balance-loop",
    title: seed.title,
    difficulty: seed.difficulty,
    rows: seed.size,
    cols: seed.size,
    colors: [],
    endpoints: {},
    solution: {},
    blockedCells: [],
    prefilledEdges: [],
    loopClues: seed.clues.map(([row, col, kind, value]) => ({
      row,
      col,
      kind,
      ...(value === undefined ? {} : { value })
    })),
    solutionEdges: seed.solutionEdges.split(" ") as CellEdgeKey[]
  };
}

type ShingokiLevelSeed = {
  title: string;
  difficulty: string;
  rows: number;
  cols: number;
  clues: Array<[number, number, "white" | "black" | "gray", number]>;
  solutionEdges: string;
};

const SHINGOKI_LEVEL_SEEDS: ShingokiLevelSeed[] = [
  {
    title: "白灯入门",
    difficulty: "入门",
    rows: 5,
    cols: 5,
    clues: [
      [1, 1, "white", 2],
      [2, 1, "white", 2],
      [3, 2, "white", 2],
      [3, 3, "white", 3]
    ],
    solutionEdges:
      "ch:1:1 cv:0:2 ch:0:2 ch:0:3 cv:0:4 ch:1:3 cv:1:3 cv:2:3 cv:3:3 ch:4:2 cv:3:2 cv:2:2 ch:2:1 ch:2:0 cv:1:0 ch:1:0"
  },
  {
    title: "黑灯拆分",
    difficulty: "入门",
    rows: 5,
    cols: 5,
    clues: [
      [0, 1, "black", 2],
      [1, 0, "black", 2],
      [2, 3, "black", 3],
      [2, 4, "black", 3],
      [4, 1, "black", 3]
    ],
    solutionEdges:
      "ch:1:2 cv:0:3 ch:0:3 cv:0:4 cv:1:4 ch:2:3 cv:2:3 cv:3:3 ch:4:2 ch:4:1 cv:3:1 ch:3:1 cv:2:2 ch:2:1 ch:2:0 cv:1:0 ch:1:0 cv:0:1 ch:0:1 cv:0:2"
  },
  {
    title: "双色接力",
    difficulty: "简单",
    rows: 6,
    cols: 6,
    clues: [
      [0, 4, "black", 2],
      [2, 2, "black", 2],
      [3, 2, "black", 2],
      [3, 4, "white", 2],
      [3, 5, "white", 3],
      [4, 0, "white", 2],
      [4, 1, "black", 2]
    ],
    solutionEdges:
      "ch:1:2 cv:0:3 ch:0:3 cv:0:4 ch:1:4 cv:1:5 cv:2:5 cv:3:5 ch:4:4 cv:3:4 cv:2:4 ch:2:3 cv:2:3 ch:3:2 cv:3:2 ch:4:1 cv:4:1 ch:5:0 cv:4:0 cv:3:0 ch:3:0 cv:2:1 ch:2:1 cv:1:2"
  },
  {
    title: "长短交锁",
    difficulty: "进阶",
    rows: 6,
    cols: 6,
    clues: [
      [1, 5, "white", 3],
      [2, 2, "black", 4],
      [2, 3, "black", 3],
      [2, 5, "white", 3],
      [3, 2, "white", 3],
      [5, 5, "black", 3]
    ],
    solutionEdges:
      "cv:1:2 cv:0:2 ch:0:2 cv:0:3 cv:1:3 ch:2:3 cv:1:4 cv:0:4 ch:0:4 cv:0:5 cv:1:5 cv:2:5 ch:3:4 cv:3:4 ch:4:4 cv:4:5 ch:5:4 ch:5:3 cv:4:3 cv:3:3 ch:3:2 ch:3:1 ch:3:0 cv:2:0 ch:2:0 ch:2:1"
  },
  {
    title: "灰灯反推",
    difficulty: "困难",
    rows: 7,
    cols: 7,
    clues: [
      [1, 1, "white", 2],
      [2, 0, "white", 3],
      [2, 1, "black", 4],
      [3, 4, "gray", 2],
      [3, 5, "black", 2],
      [4, 3, "black", 2],
      [6, 1, "black", 2],
      [6, 6, "black", 7]
    ],
    solutionEdges:
      "cv:3:1 ch:3:0 cv:2:0 cv:1:0 cv:0:0 ch:0:0 cv:0:1 cv:1:1 ch:2:1 ch:2:2 cv:2:3 ch:3:2 cv:3:2 ch:4:2 cv:4:3 ch:5:3 ch:5:4 cv:4:5 ch:4:4 cv:3:4 cv:2:4 ch:2:4 cv:2:5 ch:3:5 cv:3:6 cv:4:6 cv:5:6 ch:6:5 ch:6:4 ch:6:3 ch:6:2 cv:5:2 ch:5:1 cv:5:1 ch:6:0 cv:5:0 cv:4:0 ch:4:0"
  },
  {
    title: "稀灯长链",
    difficulty: "专家",
    rows: 7,
    cols: 7,
    clues: [
      [0, 4, "black", 2],
      [2, 2, "black", 3],
      [2, 3, "white", 2],
      [2, 5, "black", 2],
      [4, 0, "black", 3],
      [4, 4, "white", 4],
      [6, 1, "black", 2],
      [6, 3, "black", 3]
    ],
    solutionEdges:
      "cv:1:3 ch:1:3 cv:0:4 ch:0:4 cv:0:5 ch:1:5 cv:1:6 cv:2:6 ch:3:5 cv:2:5 ch:2:4 cv:2:4 cv:3:4 cv:4:4 cv:5:4 ch:6:3 cv:5:3 cv:4:3 ch:4:2 cv:4:2 ch:5:1 cv:5:1 ch:6:0 cv:5:0 cv:4:0 ch:4:0 cv:3:1 ch:3:0 cv:2:0 ch:2:0 ch:2:1 cv:2:2 ch:3:2 cv:2:3"
  },
  {
    title: "全局牵制",
    difficulty: "极限",
    rows: 7,
    cols: 7,
    clues: [
      [1, 3, "white", 2],
      [2, 2, "black", 4],
      [3, 3, "black", 2],
      [3, 4, "black", 2],
      [5, 0, "white", 2],
      [5, 3, "black", 2],
      [5, 6, "gray", 2],
      [6, 0, "black", 3],
      [6, 5, "black", 3]
    ],
    solutionEdges:
      "ch:3:4 cv:3:5 ch:4:5 cv:4:6 ch:5:5 cv:5:5 ch:6:4 ch:6:3 cv:5:3 ch:5:3 cv:4:4 ch:4:3 cv:3:3 ch:3:2 cv:3:2 cv:4:2 ch:5:1 cv:5:1 ch:6:0 cv:5:0 cv:4:0 ch:4:0 cv:3:1 ch:3:0 cv:2:0 ch:2:0 ch:2:1 cv:1:2 cv:0:2 ch:0:2 cv:0:3 cv:1:3 ch:2:3 cv:2:4"
  },
  {
    title: "百关终局",
    difficulty: "终极",
    rows: 8,
    cols: 8,
    clues: [
      [0, 0, "gray", 5],
      [0, 5, "black", 3],
      [1, 3, "white", 2],
      [2, 5, "gray", 3],
      [3, 0, "gray", 5],
      [4, 1, "white", 2],
      [4, 5, "white", 3],
      [5, 5, "gray", 5],
      [7, 2, "black", 2],
      [7, 7, "gray", 4]
    ],
    solutionEdges:
      "ch:0:0 cv:0:0 ch:0:1 ch:0:2 ch:0:3 cv:0:4 ch:0:5 cv:0:5 cv:0:6 ch:1:0 cv:1:1 ch:1:2 cv:1:2 ch:1:3 cv:1:5 ch:1:6 cv:1:7 ch:2:0 cv:2:0 ch:2:2 ch:2:3 cv:2:4 ch:2:5 cv:2:6 cv:2:7 cv:3:0 ch:3:1 cv:3:1 ch:3:2 cv:3:3 ch:3:4 ch:3:5 cv:3:7 cv:4:0 cv:4:1 ch:4:3 ch:4:4 ch:4:5 cv:4:6 cv:4:7 cv:5:0 ch:5:1 ch:5:2 ch:5:3 ch:5:4 cv:5:5 ch:5:6 cv:6:0 ch:6:1 cv:6:1 cv:6:2 ch:6:3 cv:6:3 cv:6:4 ch:6:5 ch:6:6 cv:6:7 ch:7:0 ch:7:2 ch:7:4 ch:7:5 ch:7:6"
  }
];

function createShingokiLevel(
  seed: ShingokiLevelSeed,
  offset: number
): CellLoopLevel {
  return {
    id: 93 + offset,
    chapter: 12,
    chapterTitle: "交通灯",
    mode: "shingoki",
    title: seed.title,
    difficulty: seed.difficulty,
    rows: seed.rows,
    cols: seed.cols,
    colors: [],
    endpoints: {},
    solution: {},
    blockedCells: [],
    prefilledEdges: [],
    loopClues: seed.clues.map(([row, col, kind, value]) => ({
      row,
      col,
      kind,
      value
    })),
    solutionEdges: seed.solutionEdges.split(" ") as CellEdgeKey[]
  };
}

export const MASYU_LEVELS = MASYU_LEVEL_SEEDS.map(createMasyuLevel);
export const MIDLOOP_LEVELS = MIDLOOP_LEVEL_SEEDS.map(createMidloopLevel);
export const BALANCE_LOOP_LEVELS =
  BALANCE_LOOP_LEVEL_SEEDS.map(createBalanceLoopLevel);
export const GERADEWEG_LEVELS =
  GERADEWEG_LEVEL_SEEDS.map(createGeradewegLevel);
export const SHINGOKI_LEVELS =
  SHINGOKI_LEVEL_SEEDS.map(createShingokiLevel);
export { PIPELINK_LEVELS };

export const CELL_LOOP_LEVELS: CellLoopLevel[] = [
  ...PIPELINK_LEVELS,
  ...MASYU_LEVELS,
  ...MIDLOOP_LEVELS,
  ...BALANCE_LOOP_LEVELS,
  ...GERADEWEG_LEVELS,
  ...SHINGOKI_LEVELS
];
