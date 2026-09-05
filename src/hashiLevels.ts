import {
  bridgeKey,
  type BridgeMap,
  type HashiIsland,
  type HashiLevel
} from "./hashi";

type HashiSeed = {
  id: number;
  title: string;
  difficulty: string;
  size: number;
  islands: string;
  bridges: string[];
};

const SEEDS: HashiSeed[] = [
  {
    id: 53,
    title: "第一座桥",
    difficulty: "入门",
    size: 5,
    islands: "001 021 042 202 242 402 442",
    bridges: ["B-C", "D-F", "F-G", "A-D", "C-E", "E-G"]
  },
  {
    id: 54,
    title: "双桥支点",
    difficulty: "简单",
    size: 5,
    islands: "011 032 043 212 223 243 402 413 421",
    bridges: ["G-H:2", "E-F", "D-E", "E-I", "A-B", "D-H", "B-C", "C-F:2"]
  },
  {
    id: 55,
    title: "高数传播",
    difficulty: "简单",
    size: 6,
    islands: "001 032 041 112 133 145 153 212 242 541 552",
    bridges: ["B-E", "F-I", "G-K", "D-H", "F-G:2", "D-E", "H-I", "A-B", "J-K", "C-F", "E-F"]
  },
  {
    id: 56,
    title: "交叉航道",
    difficulty: "进阶",
    size: 6,
    islands: "022 043 121 252 303 312 323 343 403 423 454 541 552",
    bridges: ["A-B", "I-J", "F-G", "B-H:2", "G-J", "J-K", "G-H", "A-C", "K-M", "D-K:2", "E-F", "L-M", "E-I:2"]
  },
  {
    id: 57,
    title: "群岛分流",
    difficulty: "困难",
    size: 7,
    islands: "062 113 133 163 201 214 222 241 312 322 333 342 352 632 652",
    bridges: ["B-F", "B-C:2", "L-M", "J-K", "I-J", "K-L", "A-D:2", "C-D", "E-F", "N-O", "G-H", "K-N", "F-G", "F-I", "M-O"]
  },
  {
    id: 58,
    title: "迷雾群岛",
    difficulty: "专家",
    size: 7,
    islands: "001 023 042 062 123 131 211 223 232 241 302 363 431 453 462 502 512 533 542 552 621 632",
    bridges: ["K-P", "D-L", "B-C", "K-L", "I-J", "R-V", "C-D", "M-N", "H-I", "A-B", "G-H", "E-H", "E-F", "L-O", "S-T", "N-O", "N-T", "B-E", "R-S", "U-V", "Q-R", "P-Q"]
  },
  {
    id: 59,
    title: "交叉封锁",
    difficulty: "极限",
    size: 7,
    islands: "011 023 032 101 123 152 202 222 242 302 313 343 353 361 402 414 421 514 523 532 601 613 642",
    bridges: ["L-W", "A-K", "E-H", "E-F", "P-R", "S-T:2", "I-L", "P-Q", "O-U", "V-W", "R-V:2", "L-M", "F-M", "B-E", "O-P", "R-S", "K-P", "J-K", "M-N", "D-G", "B-C:2", "G-J", "H-I"]
  },
  {
    id: 60,
    title: "终极桥阵",
    difficulty: "终极",
    size: 7,
    islands: "032 052 061 101 122 134 153 162 203 212 223 241 262 322 422 441 462 502 553 561 611 622 633 653",
    bridges: ["G-S", "K-N", "F-G", "J-K", "B-C", "E-F:2", "K-L", "M-Q", "U-V", "N-O", "S-X", "G-H", "I-R", "A-F", "V-W", "Q-T", "R-S", "H-M", "D-I", "A-B", "W-X:2", "I-J", "O-P"]
  }
];

function parseIslands(encoded: string): HashiIsland[] {
  return encoded.split(" ").map((value, index) => ({
    id: String.fromCharCode(65 + index),
    row: Number(value[0]),
    col: Number(value[1]),
    target: Number(value[2])
  }));
}

function parseBridges(encoded: string[]): BridgeMap {
  return Object.fromEntries(
    encoded.map((value) => {
      const [pair, count = "1"] = value.split(":");
      const [first, second] = pair.split("-");
      return [bridgeKey(first, second), Number(count) as 1 | 2];
    })
  );
}

export const HASHI_LEVELS: HashiLevel[] = SEEDS.map((seed) => ({
  id: seed.id,
  chapter: 7,
  chapterTitle: "数桥",
  mode: "hashi",
  title: seed.title,
  difficulty: seed.difficulty,
  rows: seed.size,
  cols: seed.size,
  colors: [],
  endpoints: {},
  solution: {},
  islands: parseIslands(seed.islands),
  solutionBridges: parseBridges(seed.bridges)
}));
