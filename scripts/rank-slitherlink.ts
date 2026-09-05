import { readFileSync } from "node:fs";
import type { SlitherlinkLevel } from "../src/slitherlink";
import { countSolutions } from "./verify-slitherlink";

type DatasetEntry = {
  problem: string;
};

type Dataset = {
  data: Record<string, DatasetEntry>;
};

function parseLevel(key: string, problem: string): SlitherlinkLevel {
  const lines = problem.trim().split("\n");
  const [rows, cols] = lines[0].split(" ").map(Number);
  const clues = lines.slice(1).map((line) =>
    line.split(" ").map((value) => (value === "-" ? null : Number(value)))
  );

  return {
    id: Number(key.split("_")[0]),
    chapter: 3,
    chapterTitle: "数回",
    mode: "slitherlink",
    title: key,
    difficulty: "分析",
    rows,
    cols,
    colors: [],
    endpoints: {},
    solution: {},
    clues,
    solutionEdges: []
  };
}

const [datasetPath, sizeArgument] = process.argv.slice(2);
if (!datasetPath || !sizeArgument) {
  throw new Error("Usage: vite-node scripts/rank-slitherlink.ts <dataset.json> <size>");
}

const dataset = JSON.parse(readFileSync(datasetPath, "utf8")) as Dataset;
const size = Number(sizeArgument);
const ranked = Object.entries(dataset.data)
  .filter(([key]) => key.endsWith(`_${size}x${size}`))
  .map(([key, entry]) => {
    const level = parseLevel(key, entry.problem);
    return { key, clues: level.clues, ...countSolutions(level) };
  })
  .filter((result) => !result.aborted && result.count === 1)
  .sort((a, b) => b.nodes - a.nodes);

console.log(JSON.stringify(ranked, null, 2));
