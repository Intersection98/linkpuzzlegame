import { NUMBERLINK_LEVELS } from "../src/levels";
import { NUMBER_END_LEVELS } from "../src/numberEndLevels";
import { solveNumberlink } from "./find-hard-levels.mjs";

const checks = [
  ...NUMBERLINK_LEVELS.slice(6).map((level, index) => ({
    level,
    minimumNodes: [600, 2_000, 3_000, 7_000][index]
  })),
  ...NUMBER_END_LEVELS.map((level, index) => ({
    level,
    minimumNodes: [20, 30, 40, 120, 140, 180, 450, 500][index]
  }))
];

for (const { level, minimumNodes } of checks) {
  const pairs = level.colors.map((color) =>
    level.endpoints[color.id].map(
      (point) => point.row * level.cols + point.col
    )
  );
  const targetLengths = level.targetLengths
    ? level.colors.map((color) => level.targetLengths![color.id])
    : null;
  const result = solveNumberlink(
    level.rows,
    level.cols,
    pairs,
    2,
    100_000,
    targetLengths
  );

  if (result.aborted || result.solutions.length !== 1) {
    throw new Error(
      `Level ${level.id} failed uniqueness: solutions=${result.solutions.length}, aborted=${result.aborted}`
    );
  }
  if (result.nodes < minimumNodes) {
    throw new Error(
      `Level ${level.id} is below its difficulty floor: ${result.nodes} < ${minimumNodes}`
    );
  }

  console.log(`Level ${level.id}: unique, search nodes ${result.nodes}`);
}
