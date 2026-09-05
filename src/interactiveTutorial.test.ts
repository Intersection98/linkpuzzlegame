import { describe, expect, it } from "vitest";
import {
  TUTORIAL_LEVEL_IDS,
  TUTORIAL_STEPS,
  getTutorialSteps,
  getTutorialProgress,
  isTutorialStepComplete,
  type TutorialPuzzleState
} from "./InteractiveTutorial";
import {
  BALANCE_LOOP_LEVELS,
  GERADEWEG_LEVELS,
  MASYU_LEVELS,
  MIDLOOP_LEVELS,
  PIPELINK_LEVELS,
  SHINGOKI_LEVELS
} from "./cellLoopLevels";
import { isCellLoopLevel, pipeClueEdges } from "./cellLoop";
import type { NumberlinkLevel } from "./game";
import { isHashiLevel } from "./hashi";
import { HASHI_LEVELS } from "./hashiLevels";
import { NUMBERLINK_LEVELS } from "./levels";
import { isMejilinkLevel } from "./mejilink";
import { MEJILINK_LEVELS } from "./mejilinkLevels";
import { NUMBER_END_LEVELS } from "./numberEndLevels";
import { getCellEdges, isSlitherlinkLevel } from "./slitherlink";
import { SLITHERLINK_LEVELS } from "./slitherlinkLevels";
import { isThermometerLevel } from "./thermometers";
import { THERMOMETER_LEVELS } from "./thermometerLevels";

const OPENING_LEVELS: NumberlinkLevel[] = [
  NUMBERLINK_LEVELS[0],
  NUMBER_END_LEVELS[0],
  SLITHERLINK_LEVELS[0],
  MEJILINK_LEVELS[0],
  PIPELINK_LEVELS[0],
  THERMOMETER_LEVELS[0],
  HASHI_LEVELS[0],
  MASYU_LEVELS[0],
  MIDLOOP_LEVELS[0],
  BALANCE_LOOP_LEVELS[0],
  GERADEWEG_LEVELS[0],
  SHINGOKI_LEVELS[0]
];

function emptyState(): TutorialPuzzleState {
  return {
    paths: {},
    marks: {},
    thermometers: {},
    bridges: {}
  };
}

function solvedState(level: NumberlinkLevel): TutorialPuzzleState {
  const state = emptyState();
  if (level.mode === "numberlink" || level.mode === "number-end") {
    state.paths = level.solution;
  } else if (
    isSlitherlinkLevel(level) ||
    isMejilinkLevel(level) ||
    isCellLoopLevel(level)
  ) {
    state.marks = Object.fromEntries(
      level.solutionEdges.map((edge) => [edge, "line" as const])
    );
  } else if (isThermometerLevel(level)) {
    state.thermometers = level.solutionFill;
  } else if (isHashiLevel(level)) {
    state.bridges = level.solutionBridges;
  }
  return state;
}

describe("interactive chapter tutorials", () => {
  it("defines staged teaching for every puzzle mode", () => {
    expect(Object.keys(TUTORIAL_STEPS)).toHaveLength(12);
    Object.values(TUTORIAL_STEPS).forEach((steps) => {
      expect(steps.length).toBeGreaterThanOrEqual(3);
      expect(steps.at(-1)?.requirement).toEqual({ type: "solve" });
    });
  });

  it("adds follow-up teaching when a second level introduces a new rule", () => {
    expect(TUTORIAL_LEVEL_IDS).toEqual([
      1, 11, 19, 20, 29, 30, 37, 38, 45, 53, 54, 61, 62, 69, 70, 77, 78,
      85, 86, 93, 94
    ]);
    expect(getTutorialSteps("masyu", 62)[0].title).toBe("黑珠处必须转弯");
    expect(getTutorialSteps("shingoki", 94)[0].title).toBe("黑灯必须转弯");
    expect(getTutorialSteps("hashi", 54)[1].title).toBe("升级为双桥");
  });

  it("teaches Slitherlink numbers before exclusion marks", () => {
    expect(getTutorialSteps("slitherlink", 19).map((step) => step.title)).toEqual([
      "数字表示周围线数",
      "数字 0 周围不能有线",
      "只保留一个环"
    ]);
  });

  it.each(OPENING_LEVELS)(
    "recognizes the solved state of opening level $id",
    (level) => {
      expect(getTutorialProgress(level, solvedState(level)).solved).toBe(true);
    }
  );

  it("only advances the Slitherlink exclusion step around a zero clue", () => {
    const level = SLITHERLINK_LEVELS[0];
    const zeroEdges = new Set<string>();
    level.clues.forEach((row, rowIndex) => {
      row.forEach((clue, colIndex) => {
        if (clue !== 0) return;
        getCellEdges(rowIndex, colIndex).forEach((edge) => zeroEdges.add(edge));
      });
    });
    const solutionEdges = new Set<string>(level.solutionEdges);
    const zeroEdge = [...zeroEdges].find(
      (edge) => !solutionEdges.has(edge)
    )!;
    const unrelatedEdge = [
      "h:1:1",
      "h:2:1",
      "v:1:2",
      "v:2:2"
    ].find((edge) => !zeroEdges.has(edge))!;

    expect(
      getTutorialProgress(level, {
        ...emptyState(),
        marks: { [unrelatedEdge]: "cross" }
      }).correctCrosses
    ).toBe(0);
    expect(
      getTutorialProgress(level, {
        ...emptyState(),
        marks: { [zeroEdge]: "cross" }
      }).correctCrosses
    ).toBe(1);
  });

  it("treats fixed Pipelink pieces as the baseline, not a player action", () => {
    const level = PIPELINK_LEVELS[0];
    const before = getTutorialProgress(level, emptyState());
    const fixed = new Set(pipeClueEdges(level));
    const nextEdge = level.solutionEdges.find((edge) => !fixed.has(edge))!;
    const after = getTutorialProgress(level, {
      ...emptyState(),
      marks: { [nextEdge]: "line" }
    });

    expect(after.correctLines).toBe(before.correctLines + 1);
    expect(
      isTutorialStepComplete(TUTORIAL_STEPS.pipelink[0], before, after)
    ).toBe(true);
  });
});
