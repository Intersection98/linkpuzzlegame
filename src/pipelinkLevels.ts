import type {
  CellEdgeKey,
  CellLoopLevel,
  PipeClue
} from "./cellLoop";

type PipelinkSeed = {
  id: number;
  title: string;
  difficulty: string;
  source: string;
  rows: number;
  cols: number;
  clues: PipeClue[];
  solution: string;
};

const SEEDS: PipelinkSeed[] = [
  {
    id: 37,
    title: "接管",
    difficulty: "入门",
    source: "https://puzz.link/p?pipelink/4/4/ldkfl",
    rows: 4,
    cols: 4,
    clues: [
      { row: 1, col: 1, directions: ["up", "right"] },
      { row: 2, col: 2, directions: ["down", "left"] }
    ],
    solution: "ch:0:0 cv:0:0 cv:0:1 ch:0:2 cv:0:2 cv:0:3 cv:1:0 ch:1:1 cv:1:3 cv:2:0 ch:2:1 cv:2:1 cv:2:2 cv:2:3 ch:3:0 ch:3:2"
  },
  {
    id: 38,
    title: "交汇",
    difficulty: "简单",
    source: "https://puzz.link/p?pipelink/4/4/ldkal",
    rows: 4,
    cols: 4,
    clues: [
      { row: 1, col: 1, directions: ["up", "right"] },
      {
        row: 2,
        col: 2,
        directions: ["up", "right", "down", "left"]
      }
    ],
    solution: "ch:0:0 cv:0:0 cv:0:1 ch:0:2 cv:0:2 cv:0:3 cv:1:0 ch:1:1 ch:1:2 cv:1:2 cv:2:0 ch:2:1 cv:2:1 ch:2:2 cv:2:2 cv:2:3 ch:3:0 ch:3:2"
  },
  {
    id: 39,
    title: "双直管",
    difficulty: "简单",
    source: "https://puzz.link/p?pipelink/5/5/mbqcn",
    rows: 5,
    cols: 5,
    clues: [
      { row: 1, col: 1, directions: ["up", "down"] },
      { row: 3, col: 2, directions: ["right", "left"] }
    ],
    solution: "ch:0:0 cv:0:0 cv:0:1 ch:0:2 cv:0:2 ch:0:3 cv:0:4 cv:1:0 cv:1:1 cv:1:2 ch:1:3 cv:1:3 cv:2:0 cv:2:1 ch:2:2 ch:2:3 cv:2:3 cv:2:4 cv:3:0 ch:3:1 ch:3:2 cv:3:4 ch:4:0 ch:4:1 ch:4:2 ch:4:3"
  },
  {
    id: 40,
    title: "折返",
    difficulty: "进阶",
    source: "https://puzz.link/p?pipelink/6/6/ogmeqdeo",
    rows: 6,
    cols: 6,
    clues: [
      { row: 1, col: 2, directions: ["right", "down"] },
      { row: 2, col: 3, directions: ["up", "left"] },
      { row: 4, col: 2, directions: ["up", "right"] },
      { row: 4, col: 3, directions: ["up", "left"] }
    ],
    solution: "ch:0:0 cv:0:0 ch:0:1 ch:0:2 cv:0:3 ch:0:4 cv:0:4 cv:0:5 ch:1:0 cv:1:1 ch:1:2 cv:1:2 ch:1:3 cv:1:3 ch:1:4 cv:1:4 ch:2:0 cv:2:0 ch:2:1 cv:2:1 ch:2:2 cv:2:2 ch:2:4 cv:2:5 ch:3:0 ch:3:1 cv:3:1 ch:3:2 cv:3:2 cv:3:3 ch:3:4 cv:3:4 ch:4:0 cv:4:0 ch:4:2 ch:4:4 cv:4:5 ch:5:0 ch:5:1 ch:5:2 ch:5:3 ch:5:4"
  },
  {
    id: 41,
    title: "隐性交叉",
    difficulty: "困难",
    source: "https://puzz.link/p?pipelink/6/6/jgqfhgqfo",
    rows: 6,
    cols: 6,
    clues: [
      { row: 0, col: 3, directions: ["right", "down"] },
      { row: 2, col: 2, directions: ["down", "left"] },
      { row: 2, col: 4, directions: ["right", "down"] },
      { row: 4, col: 3, directions: ["down", "left"] }
    ],
    solution: "ch:0:0 cv:0:0 ch:0:1 cv:0:2 ch:0:3 cv:0:3 ch:0:4 cv:0:5 ch:1:0 cv:1:1 ch:1:2 ch:1:3 cv:1:3 ch:1:4 ch:2:0 cv:2:0 ch:2:1 cv:2:1 cv:2:2 cv:2:3 ch:2:4 cv:2:4 cv:2:5 ch:3:0 cv:3:2 ch:3:3 ch:3:4 cv:3:4 ch:4:0 cv:4:0 ch:4:1 ch:4:2 cv:4:2 cv:4:3 ch:4:4 cv:4:5 ch:5:0 ch:5:1 ch:5:3 ch:5:4"
  },
  {
    id: 42,
    title: "交叉阵列",
    difficulty: "困难",
    source: "https://puzz.link/p?pipelink/6/6/nahakamajaq",
    rows: 6,
    cols: 6,
    clues: [
      {
        row: 1,
        col: 1,
        directions: ["up", "right", "down", "left"]
      },
      {
        row: 1,
        col: 3,
        directions: ["up", "right", "down", "left"]
      },
      {
        row: 2,
        col: 2,
        directions: ["up", "right", "down", "left"]
      },
      {
        row: 3,
        col: 3,
        directions: ["up", "right", "down", "left"]
      },
      {
        row: 4,
        col: 1,
        directions: ["up", "right", "down", "left"]
      }
    ],
    solution: "ch:0:0 cv:0:0 cv:0:1 ch:0:2 cv:0:2 cv:0:3 ch:0:4 cv:0:4 cv:0:5 ch:1:0 ch:1:1 cv:1:1 ch:1:2 cv:1:2 ch:1:3 cv:1:3 cv:1:5 ch:2:0 cv:2:0 ch:2:1 cv:2:1 ch:2:2 cv:2:2 ch:2:3 cv:2:3 cv:2:4 cv:2:5 ch:3:0 ch:3:1 cv:3:1 ch:3:2 cv:3:2 ch:3:3 cv:3:3 ch:3:4 cv:3:4 ch:4:0 cv:4:0 ch:4:1 cv:4:1 ch:4:2 cv:4:2 ch:4:4 cv:4:5 ch:5:0 ch:5:2 ch:5:3 ch:5:4"
  },
  {
    id: 43,
    title: "交叉锁",
    difficulty: "专家",
    source: "https://puzz.link/p?pipelink/7/7/pfhajdjdpajfjdhdp",
    rows: 7,
    cols: 7,
    clues: [
      { row: 1, col: 2, directions: ["down", "left"] },
      {
        row: 1,
        col: 4,
        directions: ["up", "right", "down", "left"]
      },
      { row: 2, col: 1, directions: ["up", "right"] },
      { row: 2, col: 5, directions: ["up", "right"] },
      {
        row: 4,
        col: 1,
        directions: ["up", "right", "down", "left"]
      },
      { row: 4, col: 5, directions: ["down", "left"] },
      { row: 5, col: 2, directions: ["up", "right"] },
      { row: 5, col: 4, directions: ["up", "right"] }
    ],
    solution: "ch:0:0 cv:0:0 ch:0:1 ch:0:2 cv:0:3 ch:0:4 cv:0:4 ch:0:5 cv:0:6 cv:1:0 ch:1:1 cv:1:1 cv:1:2 ch:1:3 ch:1:4 cv:1:4 cv:1:5 cv:1:6 cv:2:0 ch:2:1 ch:2:2 cv:2:2 ch:2:3 ch:2:5 cv:3:0 ch:3:1 cv:3:1 ch:3:2 cv:3:2 cv:3:3 ch:3:4 cv:3:4 ch:3:5 cv:3:6 ch:4:0 ch:4:1 cv:4:1 ch:4:2 cv:4:2 ch:4:3 cv:4:3 ch:4:4 cv:4:4 cv:4:5 cv:4:6 ch:5:0 cv:5:0 ch:5:2 ch:5:4 cv:5:6 ch:6:0 ch:6:1 ch:6:2 ch:6:3 ch:6:4 ch:6:5"
  },
  {
    id: 44,
    title: "总管终局",
    difficulty: "极限",
    source: "https://puzz.link/p?pipelink/7/7/pdhetgjdjekeq",
    rows: 7,
    cols: 7,
    clues: [
      { row: 1, col: 2, directions: ["up", "right"] },
      { row: 1, col: 4, directions: ["up", "left"] },
      { row: 3, col: 4, directions: ["right", "down"] },
      { row: 4, col: 1, directions: ["up", "right"] },
      { row: 4, col: 5, directions: ["up", "left"] },
      { row: 5, col: 3, directions: ["up", "left"] }
    ],
    solution: "ch:0:0 cv:0:0 ch:0:1 cv:0:2 ch:0:3 cv:0:3 cv:0:4 ch:0:5 cv:0:5 cv:0:6 ch:1:0 cv:1:1 ch:1:2 ch:1:3 cv:1:3 cv:1:5 cv:1:6 ch:2:0 cv:2:0 ch:2:1 cv:2:1 ch:2:2 ch:2:3 cv:2:3 ch:2:4 ch:2:5 cv:2:5 cv:3:0 cv:3:1 ch:3:2 cv:3:2 ch:3:4 cv:3:4 ch:3:5 cv:3:5 cv:3:6 cv:4:0 ch:4:1 ch:4:2 cv:4:2 cv:4:3 ch:4:4 cv:4:6 cv:5:0 ch:5:1 cv:5:1 ch:5:2 cv:5:2 ch:5:4 cv:5:4 cv:5:5 cv:5:6 ch:6:0 ch:6:2 ch:6:3 ch:6:5"
  }
];

export const PIPELINK_LEVELS: CellLoopLevel[] = SEEDS.map((seed) => ({
  id: seed.id,
  chapter: 5,
  chapterTitle: "管道回路",
  mode: "pipelink",
  title: seed.title,
  difficulty: seed.difficulty,
  rows: seed.rows,
  cols: seed.cols,
  colors: [],
  endpoints: {},
  solution: {},
  blockedCells: [],
  prefilledEdges: [],
  pipeClues: seed.clues,
  loopClues: [],
  solutionEdges: seed.solution.split(" ") as CellEdgeKey[]
}));
