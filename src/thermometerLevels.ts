import type {
  Thermometer,
  ThermometerLevel,
  ThermometerState
} from "./thermometers";

type ThermometerSeed = {
  id: number;
  title: string;
  difficulty: string;
  size: number;
  paths: string[];
  fills: number[];
  rowTargets: number[];
  colTargets: number[];
};

const SEEDS: ThermometerSeed[] = [
  {
    id: 45,
    title: "初识刻度",
    difficulty: "入门",
    size: 4,
    paths: [
      "00 01 02 03",
      "13 12 11 10",
      "20 21 22 23",
      "33 32 31 30"
    ],
    fills: [1, 3, 2, 4],
    rowTargets: [1, 3, 2, 4],
    colTargets: [3, 3, 2, 2]
  },
  {
    id: 46,
    title: "横纵交替",
    difficulty: "简单",
    size: 5,
    paths: [
      "00 01 02 03 04",
      "14 13 12 11 10",
      "20 30 40",
      "41 31 21",
      "22 32 42",
      "43 33 23",
      "24 34 44"
    ],
    fills: [2, 4, 1, 2, 3, 0, 2],
    rowTargets: [2, 4, 3, 3, 2],
    colTargets: [2, 4, 4, 1, 3]
  },
  {
    id: 47,
    title: "分区读数",
    difficulty: "简单",
    size: 6,
    paths: [
      "00 10 20 30 40 50",
      "51 41 31 21 11 01",
      "02 12 22 32 42 52",
      "03 04 05",
      "15 14 13",
      "23 24 25",
      "35 34 33",
      "43 44 45",
      "55 54 53"
    ],
    fills: [2, 4, 5, 1, 2, 3, 0, 2, 1],
    rowTargets: [3, 4, 5, 2, 4, 2],
    colTargets: [2, 4, 5, 3, 3, 3]
  },
  {
    id: 48,
    title: "直线矩阵",
    difficulty: "进阶",
    size: 6,
    paths: [
      "00 01 02",
      "12 11 10",
      "20 21 22",
      "03 13 23",
      "24 14 04",
      "05 15 25",
      "30 40 50",
      "51 41 31",
      "32 42 52",
      "35 34 33",
      "43 44 45",
      "53 54 55"
    ],
    fills: [3, 3, 0, 2, 0, 2, 2, 0, 3, 3, 0, 2],
    rowTargets: [5, 5, 0, 5, 2, 3],
    colTargets: [4, 2, 5, 4, 2, 3]
  },
  {
    id: 49,
    title: "折管入门",
    difficulty: "困难",
    size: 6,
    paths: [
      "35 25 15 05 04",
      "24 14 13 03",
      "44 34",
      "51 52 53 54 55 45",
      "50 40",
      "01 00 10 20 30",
      "11 12 02",
      "31 21",
      "41 42 32",
      "43 33 23 22"
    ],
    fills: [1, 2, 0, 6, 0, 3, 3, 0, 3, 3],
    rowTargets: [3, 4, 2, 3, 4, 5],
    colTargets: [2, 4, 5, 4, 3, 3]
  },
  {
    id: 50,
    title: "冷热分区",
    difficulty: "困难",
    size: 7,
    paths: [
      "24 23 33 34 44",
      "36 26 25 35 45",
      "56 46",
      "66 65 55",
      "54 64 63 53",
      "11 21 22 32 42 43",
      "15 14 13 12",
      "16 06",
      "05 04 03 02 01 00",
      "10 20 30 31 41 40",
      "50 60 61 62 52 51"
    ],
    fills: [4, 4, 0, 0, 0, 1, 1, 1, 4, 1, 6],
    rowTargets: [4, 4, 4, 4, 0, 3, 3],
    colTargets: [3, 3, 3, 3, 3, 4, 3]
  },
  {
    id: 51,
    title: "稀疏刻度",
    difficulty: "专家",
    size: 7,
    paths: [
      "51 61 60 50 40",
      "30 20",
      "00 10",
      "13 03 02 01",
      "12 11 21 31 41 42",
      "43 53",
      "62 52",
      "65 64 63",
      "56 66",
      "55 45 35 36 46",
      "34 44 54",
      "22 32 33",
      "04 14 24 23",
      "05 06 16 15 25 26"
    ],
    fills: [3, 1, 0, 1, 2, 1, 1, 0, 2, 1, 1, 3, 2, 6],
    rowTargets: [3, 6, 3, 4, 1, 3, 4],
    colTargets: [2, 3, 4, 3, 3, 4, 5]
  },
  {
    id: 52,
    title: "温度终局",
    difficulty: "极限",
    size: 7,
    paths: [
      "31 32",
      "42 41 51 52 53",
      "43 33 23",
      "50 40 30 20 21 22",
      "60 61",
      "54 64 63 62",
      "45 44",
      "56 66 65 55",
      "25 26 36 46",
      "35 34 24 14 13",
      "12 11 10 00 01",
      "02 03 04 05",
      "06 16 15"
    ],
    fills: [0, 2, 2, 2, 0, 3, 0, 0, 4, 4, 5, 2, 1],
    rowTargets: [5, 4, 3, 4, 5, 2, 2],
    colTargets: [4, 3, 3, 4, 5, 2, 4]
  }
];

function parseThermometers(paths: string[]): Thermometer[] {
  return paths.map((path, index) => ({
    id: `t${index}`,
    cells: path.split(" ").map((cell) => ({
      row: Number(cell[0]),
      col: Number(cell[1])
    }))
  }));
}

export const THERMOMETER_LEVELS: ThermometerLevel[] = SEEDS.map((seed) => {
  const thermometers = parseThermometers(seed.paths);
  const solutionFill: ThermometerState = Object.fromEntries(
    thermometers.map((thermometer, index) => [
      thermometer.id,
      seed.fills[index]
    ])
  );
  return {
    id: seed.id,
    chapter: 6,
    chapterTitle: "温度计",
    mode: "thermometers",
    title: seed.title,
    difficulty: seed.difficulty,
    rows: seed.size,
    cols: seed.size,
    colors: [],
    endpoints: {},
    solution: {},
    thermometers,
    rowTargets: seed.rowTargets,
    colTargets: seed.colTargets,
    solutionFill
  };
});
