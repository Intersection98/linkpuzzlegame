import { solveThermometers } from "./search-thermometers";
import { THERMOMETER_LEVELS } from "../src/thermometerLevels";

declare const process: { exitCode?: number };

let failed = false;

for (const level of THERMOMETER_LEVELS) {
  const result = solveThermometers(level);
  const status = result.aborted
    ? "aborted"
    : result.count === 1
      ? "unique"
      : `${result.count} solutions`;
  console.log(`Level ${level.id}: ${status}, search nodes ${result.nodes}`);
  if (result.aborted || result.count !== 1) failed = true;
}

if (failed) process.exitCode = 1;
