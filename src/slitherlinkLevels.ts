import {
  getCellEdges,
  type EdgeKey,
  type SlitherlinkLevel
} from "./slitherlink";

type SlitherlinkSeed = {
  id: number;
  title: string;
  difficulty: string;
  clues: string[];
  inside: string[];
};

function parseClues(rows: string[]): Array<Array<number | null>> {
  return rows.map((row) =>
    [...row].map((value) => (value === "." ? null : Number(value)))
  );
}

function boundaryFromInside(rows: string[]): EdgeKey[] {
  const height = rows.length;
  const width = rows[0].length;
  const inside = (row: number, col: number) =>
    row >= 0 &&
    row < height &&
    col >= 0 &&
    col < width &&
    rows[row][col] === "x";
  const edges = new Set<EdgeKey>();

  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      if (!inside(row, col)) continue;
      if (!inside(row - 1, col)) edges.add(getCellEdges(row, col)[0]);
      if (!inside(row, col + 1)) edges.add(getCellEdges(row, col)[1]);
      if (!inside(row + 1, col)) edges.add(getCellEdges(row, col)[2]);
      if (!inside(row, col - 1)) edges.add(getCellEdges(row, col)[3]);
    }
  }

  return [...edges];
}

function createSlitherlinkLevel(seed: SlitherlinkSeed): SlitherlinkLevel {
  const rows = seed.clues.length;
  const cols = seed.clues[0].length;

  return {
    id: seed.id,
    chapter: 3,
    chapterTitle: "数回",
    mode: "slitherlink",
    title: seed.title,
    difficulty: seed.difficulty,
    rows,
    cols,
    colors: [],
    endpoints: {},
    solution: {},
    clues: parseClues(seed.clues),
    solutionEdges: boundaryFromInside(seed.inside)
  };
}

const SLITHERLINK_SEEDS: SlitherlinkSeed[] = [
  {
    id: 19,
    title: "零的边界",
    difficulty: "入门",
    clues: ["0..0", "1...", "..3.", ".0.."],
    inside: ["....", ".xx.", "..x.", "...."]
  },
  {
    id: 20,
    title: "环的起点",
    difficulty: "入门",
    clues: ["1..0", "....", "1.21", ".23."],
    inside: [".x..", ".x..", ".xx.", "..x."]
  },
  {
    id: 21,
    title: "连续转角",
    difficulty: "简单",
    clues: ["1.211", "..2..", "..02.", ".....", "112.1"],
    inside: [".xx..", "..x.x", "xxxxx", "x.x..", "..xx."]
  },
  {
    id: 22,
    title: "边缘推理",
    difficulty: "简单",
    clues: [".3.3.", "..0.2", "....1", ".2.2.", ".23.3"],
    inside: ["x.x.x", "xxxxx", "..x..", ".xxx.", "xx.xx"]
  },
  {
    id: 23,
    title: "交替内外",
    difficulty: "进阶",
    clues: [".1.13", "..2..", ".3...", "...21", "2..31"],
    inside: ["....x", "xxx.x", "x.xxx", "x....", "xxxx."]
  },
  {
    id: 24,
    title: "线索链",
    difficulty: "进阶",
    clues: [".3.3..", ".1.2..", "...0.3", "02...1", "..21.1", "3...2."],
    inside: [".x.x..", "xx.x..", ".xxxxx", "...x..", ".xxx..", "xx.xxx"]
  },
  {
    id: 25,
    title: "对角传播",
    difficulty: "困难",
    clues: ["232110", "......", "..2.1.", "1.3.2.", "2..1.3", "3.33.."],
    inside: [".x....", "xxxxx.", "x...xx", "..x.x.", ".xxxxx", "xx.x.."]
  },
  {
    id: 26,
    title: "拒绝小环",
    difficulty: "困难",
    clues: [".1....", "10.2.3", ".1.112", "..1..2", ".2.112", ".3.2.."],
    inside: ["xxx...", "xxx..x", "xxxxxx", "..xxx.", ".xxxx.", ".x..xx"]
  },
  {
    id: 27,
    title: "稀疏回路",
    difficulty: "专家",
    clues: [".2....", "3.22..", ".222.2", ".222..", "2...22", ".222.2"],
    inside: ["xxxxxx", "x....x", "..xxxx", "xxx...", "x...xx", "xxxxxx"]
  },
  {
    id: 28,
    title: "单环终局",
    difficulty: "极限",
    clues: ["....22.", "3.3..21", "..3....", "....223", ".3.3...", "...3..1", ".3..23."],
    inside: ["...x..x", "x.xxxxx", "x..x..x", "xxxxx.x", "x...x..", "xx.xxx.", ".x...x."]
  }
];

export const SLITHERLINK_LEVELS: SlitherlinkLevel[] =
  SLITHERLINK_SEEDS.map(createSlitherlinkLevel);
