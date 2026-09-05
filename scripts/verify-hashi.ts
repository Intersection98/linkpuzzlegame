import { solveHashi } from "./search-hashi";
import { HASHI_LEVELS } from "../src/hashiLevels";

declare const process: { exitCode?: number };

let failed = false;

for (const level of HASHI_LEVELS) {
  const result = solveHashi(level);
  const status = result.aborted
    ? "aborted"
    : result.count === 1
      ? "unique"
      : `${result.count} solutions`;
  console.log(`Level ${level.id}: ${status}, search nodes ${result.nodes}`);
  if (result.aborted || result.count !== 1) failed = true;
}

if (failed) process.exitCode = 1;
