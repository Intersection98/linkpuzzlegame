import { Check, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  cellOwners,
  completedColorCount,
  validateBoard,
  type NumberlinkLevel,
  type PathMap,
  type PuzzleMode
} from "./game";
import {
  cellLoopProgress,
  isCellLoopLevel,
  pipeClueEdges,
  validateCellLoop
} from "./cellLoop";
import {
  isHashiLevel,
  hashiProgress,
  validateHashi,
  type BridgeMap
} from "./hashi";
import { isMejilinkLevel, mejilinkProgress, validateMejilink } from "./mejilink";
import {
  getCellEdges,
  isSlitherlinkLevel,
  slitherlinkProgress,
  validateSlitherlink,
  type EdgeMap
} from "./slitherlink";
import {
  isThermometerLevel,
  thermometerCounts,
  validateThermometers,
  type ThermometerState
} from "./thermometers";

export type TutorialProgress = {
  pathSegments: number;
  completedPaths: number;
  correctLines: number;
  correctCrosses: number;
  matchedClues: number;
  coveredCells: number;
  filledCells: number;
  matchedCounts: number;
  bridgeRoutes: number;
  doubleBridges: number;
  matchedIslands: number;
  solved: boolean;
};

export type TutorialPuzzleState = {
  paths: PathMap;
  marks: EdgeMap;
  thermometers: ThermometerState;
  bridges: BridgeMap;
};

type TutorialMetric = Exclude<keyof TutorialProgress, "solved">;
type TutorialTarget =
  | "board"
  | "endpoint"
  | "number-endpoint"
  | "zero-clue"
  | "three-clue"
  | "number-clue"
  | "region"
  | "pipe"
  | "crossing"
  | "thermometer"
  | "bridge"
  | "white-pearl"
  | "black-pearl"
  | "midpoint"
  | "edge-midpoint"
  | "balance"
  | "length-clue"
  | "traffic"
  | "black-light";

export type TutorialStep = {
  title: string;
  instruction: string;
  target: TutorialTarget;
  requirement:
    | { type: "increase"; metric: TutorialMetric }
    | { type: "decrease"; metric: TutorialMetric }
    | { type: "solve" };
};

export const TUTORIAL_STEPS: Record<PuzzleMode, TutorialStep[]> = {
  numberlink: [
    {
      title: "从端点出发",
      instruction: "按住任意彩色端点，向相邻格拖出一段线。",
      target: "endpoint",
      requirement: { type: "increase", metric: "pathSegments" }
    },
    {
      title: "连接同色端点",
      instruction: "继续拖动，直到线头吸附到相同颜色与形状的端点。",
      target: "endpoint",
      requirement: { type: "increase", metric: "completedPaths" }
    },
    {
      title: "铺满整个棋盘",
      instruction: "连接剩余颜色，让每个格子都恰好被一条路径覆盖。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  "number-end": [
    {
      title: "从数字出发",
      instruction: "按住数字端点拖动，路径旁会实时显示已占格数。",
      target: "number-endpoint",
      requirement: { type: "increase", metric: "pathSegments" }
    },
    {
      title: "长度必须刚好",
      instruction: "数字包含两端点；用恰好对应的格数连接相同数字。",
      target: "number-endpoint",
      requirement: { type: "increase", metric: "completedPaths" }
    },
    {
      title: "长度与覆盖同时成立",
      instruction: "完成剩余路径，并让所有格子都被准确覆盖。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  slitherlink: [
    {
      title: "数字表示周围线数",
      instruction: "数字表示四周四条边中应有几条属于环；先在数字 3 旁画一条线。",
      target: "three-clue",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "数字 0 周围不能有线",
      instruction: "切换到 X 模式，把数字 0 周围不可能使用的一条边标记出来。",
      target: "zero-clue",
      requirement: { type: "increase", metric: "correctCrosses" }
    },
    {
      title: "只保留一个环",
      instruction: "最终所有线路形成一个完整闭环。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  mejilink: [
    {
      title: "沿区域边界画线",
      instruction: "在深色区域边界上画一段线；区域内部的格线不可使用。",
      target: "region",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "数未使用的边",
      instruction: "每个区域的未用边数等于它占据的格数。",
      target: "region",
      requirement: { type: "increase", metric: "matchedClues" }
    },
    {
      title: "区域共同组成单环",
      instruction: "满足所有区域，并让画出的线首尾连接成一个环。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  pipelink: [
    {
      title: "接上固定管件",
      instruction: "青色管件不能改向；从它的出口沿虚线接出一段管道。",
      target: "pipe",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "每格都要贯通",
      instruction: "继续接管，让新的格子形成两个出口并被管道经过。",
      target: "pipe",
      requirement: { type: "increase", metric: "coveredCells" }
    },
    {
      title: "铺满并闭合",
      instruction: "管道要经过所有格子，最终首尾相接成一条连续回路。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  thermometers: [
    {
      title: "从球部升温",
      instruction: "点击任意管身，液体会从圆形球部连续填充到该格。",
      target: "thermometer",
      requirement: { type: "increase", metric: "filledCells" }
    },
    {
      title: "对齐行列读数",
      instruction: "调整液面，直到一行或一列的填充数与外侧数字相同。",
      target: "thermometer",
      requirement: { type: "increase", metric: "matchedCounts" }
    },
    {
      title: "同时满足所有读数",
      instruction: "每支温度计都必须连续填充，并匹配全部行列数字。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  hashi: [
    {
      title: "架起单桥",
      instruction: "点击两座相邻岛屿之间的虚线航道，建立一座桥。",
      target: "bridge",
      requirement: { type: "increase", metric: "bridgeRoutes" }
    },
    {
      title: "匹配岛屿数字",
      instruction: "继续架桥，直到一座岛的桥梁总数与岛上数字相同。",
      target: "bridge",
      requirement: { type: "increase", metric: "matchedIslands" }
    },
    {
      title: "连接整片群岛",
      instruction: "桥数匹配每座岛的数字，桥不交叉，所有岛屿保持连通。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  masyu: [
    {
      title: "穿过白猫",
      instruction: "沿格心画线，让路径从一只白猫中直线穿过。",
      target: "white-pearl",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "紧邻处必须转弯",
      instruction: "继续延伸；白猫前后相邻格中至少有一处要转弯。",
      target: "white-pearl",
      requirement: { type: "increase", metric: "matchedClues" }
    },
    {
      title: "串起全部猫咪",
      instruction: "让环经过所有猫咪，并且只形成一个完整回路。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  midloop: [
    {
      title: "从中点向外延伸",
      instruction: "沿格心画一段经过圆点的直线。",
      target: "midpoint",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "两侧必须等长",
      instruction: "让圆点到直线两端转角的距离完全相同。",
      target: "midpoint",
      requirement: { type: "increase", metric: "matchedClues" }
    },
    {
      title: "中点都在同一环上",
      instruction: "满足所有中点，再把线段连接成一个完整单环。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  "balance-loop": [
    {
      title: "画出白猫两侧",
      instruction: "沿格心画线，让路径经过一只白猫。",
      target: "balance",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "保持两臂平衡",
      instruction: "白猫到两侧首次转弯的直线长度必须相等。",
      target: "balance",
      requirement: { type: "increase", metric: "matchedClues" }
    },
    {
      title: "平衡整条回路",
      instruction: "满足全部猫咪条件，并把所有线段闭合成一个环。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  geradeweg: [
    {
      title: "经过数字圆圈",
      instruction: "沿格心画线，让路径经过一个数字圆圈。",
      target: "length-clue",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "数字丈量整段直线",
      instruction: "前后转角间的线段数必须等于圆圈中的数字。",
      target: "length-clue",
      requirement: { type: "increase", metric: "matchedClues" }
    },
    {
      title: "连接成唯一回路",
      instruction: "满足所有直线长度，并让全部线段组成一个单环。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  shingoki: [
    {
      title: "白猫必须直行",
      instruction: "沿格心画线，让路径从一只白猫中直穿。",
      target: "traffic",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "数字是两臂之和",
      instruction: "猫咪两侧到首次转弯的线段数量之和必须等于额头数字。",
      target: "traffic",
      requirement: { type: "increase", metric: "matchedClues" }
    },
    {
      title: "形状与长度同时成立",
      instruction: "满足所有猫咪提示，再将路径闭合成一个完整单环。",
      target: "board",
      requirement: { type: "solve" }
    }
  ]
};

const LEVEL_TUTORIAL_STEPS: Partial<Record<number, TutorialStep[]>> = {
  20: [
    {
      title: "数字 3 的三条边",
      instruction: "从数字 3 周围画线；它的四条边中必须恰好使用三条。",
      target: "number-clue",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "留下唯一缺口",
      instruction: "补足三条线，并把第四条不使用的边标记为 X。",
      target: "number-clue",
      requirement: { type: "increase", metric: "matchedClues" }
    },
    {
      title: "接入同一个环",
      instruction: "满足全部数字，让所有线段最终只组成一个环。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  30: [
    {
      title: "面积不是周长",
      instruction: "这个区域占两格，因此最终必须恰好留下两条边不用。",
      target: "region",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "让双格区域满足",
      instruction: "继续判断区域边界，直到该区域点亮为绿色。",
      target: "region",
      requirement: { type: "increase", metric: "matchedClues" }
    },
    {
      title: "共享边共同计数",
      instruction: "满足所有区域，并让边界线连接成一个完整单环。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  38: [
    {
      title: "交叉但不连通",
      instruction: "交叉格中横管与竖管各自直行；从一个出口接出管道。",
      target: "crossing",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "四个出口都要延续",
      instruction: "继续接管，让交叉管通向的相邻格形成完整出口。",
      target: "crossing",
      requirement: { type: "increase", metric: "coveredCells" }
    },
    {
      title: "交叉仍属于同一回路",
      instruction: "覆盖全部格子，并让所有管段最终连成一条回路。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  54: [
    {
      title: "先架起单桥",
      instruction: "点击两座相邻岛屿之间的航道，建立一座桥。",
      target: "bridge",
      requirement: { type: "increase", metric: "bridgeRoutes" }
    },
    {
      title: "升级为双桥",
      instruction: "再次点击同一航道，单桥会变成两座平行桥。",
      target: "bridge",
      requirement: { type: "increase", metric: "doubleBridges" }
    },
    {
      title: "双桥计作两座",
      instruction: "继续连接，直到一座岛的桥数与岛上数字相同。",
      target: "bridge",
      requirement: { type: "increase", metric: "matchedIslands" }
    },
    {
      title: "连接整片群岛",
      instruction: "桥梁不能交叉，所有岛屿最终必须处于同一网络。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  62: [
    {
      title: "黑猫处必须转弯",
      instruction: "从黑猫画出一个直角，路径不能直穿黑猫。",
      target: "black-pearl",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "转弯后两侧直行",
      instruction: "黑猫转弯后的前后相邻格都必须继续直行一格。",
      target: "black-pearl",
      requirement: { type: "increase", metric: "matchedClues" }
    },
    {
      title: "串起全部黑猫",
      instruction: "让环经过所有黑猫，并且只形成一个完整回路。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  70: [
    {
      title: "圆点也会落在边上",
      instruction: "画线经过格子边界上的圆点，它仍必须位于直线正中。",
      target: "edge-midpoint",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "从边中点向两侧量",
      instruction: "让圆点到两端首次转弯的距离完全相同。",
      target: "edge-midpoint",
      requirement: { type: "increase", metric: "matchedClues" }
    },
    {
      title: "两种中点连成单环",
      instruction: "同时满足格心点与边中点，再闭合成一个环。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  78: [
    {
      title: "白猫处也可以转弯",
      instruction: "让路径经过白猫；白猫处既可以直行，也可以转弯。",
      target: "balance",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "从白猫量两条直臂",
      instruction: "无论是否转弯，两侧到首次转弯的距离都必须相等。",
      target: "balance",
      requirement: { type: "increase", metric: "matchedClues" }
    },
    {
      title: "保持整条回路平衡",
      instruction: "满足全部白猫条件，并将所有线段闭合成一个环。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  86: [
    {
      title: "数字不是线段终点",
      instruction: "画线经过数字圆圈，路径可以继续延伸到后面的转角。",
      target: "length-clue",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "整段只量一次",
      instruction: "同一直线上的数字共同约束前后两端转角间的整段长度。",
      target: "length-clue",
      requirement: { type: "increase", metric: "matchedClues" }
    },
    {
      title: "让所有刻度成立",
      instruction: "满足全部数字，并把直线段连接成一个完整单环。",
      target: "board",
      requirement: { type: "solve" }
    }
  ],
  94: [
    {
      title: "黑猫必须转弯",
      instruction: "从黑猫画出一个直角，路径不能直穿黑猫。",
      target: "black-light",
      requirement: { type: "increase", metric: "correctLines" }
    },
    {
      title: "两条直臂长度求和",
      instruction: "从黑猫沿两个方向量到首次转弯，总和必须等于额头数字。",
      target: "black-light",
      requirement: { type: "increase", metric: "matchedClues" }
    },
    {
      title: "连接全部猫咪",
      instruction: "满足全部黑猫，再把所有线段连接成一个完整单环。",
      target: "board",
      requirement: { type: "solve" }
    }
  ]
};

export const TUTORIAL_LEVEL_IDS = [
  1, 11, 19, 20, 29, 30, 37, 38, 45, 53, 54, 61, 62, 69, 70, 77, 78, 85,
  86, 93, 94
] as const;

export function hasInteractiveTutorial(levelId: number): boolean {
  return TUTORIAL_LEVEL_IDS.includes(
    levelId as (typeof TUTORIAL_LEVEL_IDS)[number]
  );
}

export function getTutorialSteps(
  mode: PuzzleMode,
  levelId: number
): TutorialStep[] {
  return LEVEL_TUTORIAL_STEPS[levelId] ?? TUTORIAL_STEPS[mode];
}

const EMPTY_PROGRESS: TutorialProgress = {
  pathSegments: 0,
  completedPaths: 0,
  correctLines: 0,
  correctCrosses: 0,
  matchedClues: 0,
  coveredCells: 0,
  filledCells: 0,
  matchedCounts: 0,
  bridgeRoutes: 0,
  doubleBridges: 0,
  matchedIslands: 0,
  solved: false
};

export function getTutorialProgress(
  level: NumberlinkLevel,
  state: TutorialPuzzleState
): TutorialProgress {
  if (level.mode === "numberlink" || level.mode === "number-end") {
    return {
      ...EMPTY_PROGRESS,
      pathSegments: Object.values(state.paths).reduce(
        (sum, path) => sum + Math.max(0, path.length - 1),
        0
      ),
      completedPaths: completedColorCount(level, state.paths),
      coveredCells: cellOwners(state.paths).size,
      solved: validateBoard(level, state.paths).complete
    };
  }

  if (isSlitherlinkLevel(level)) {
    const solution = new Set<string>(level.solutionEdges);
    const zeroEdges = new Set<string>();
    level.clues.forEach((row, rowIndex) => {
      row.forEach((clue, colIndex) => {
        if (clue !== 0) return;
        getCellEdges(rowIndex, colIndex).forEach((edge) => zeroEdges.add(edge));
      });
    });
    const progress = slitherlinkProgress(level, state.marks);
    return {
      ...EMPTY_PROGRESS,
      correctLines: Object.entries(state.marks).filter(
        ([edge, mark]) => mark === "line" && solution.has(edge)
      ).length,
      correctCrosses: Object.entries(state.marks).filter(
        ([edge, mark]) => mark === "cross" && zeroEdges.has(edge)
      ).length,
      matchedClues: progress.satisfiedClues,
      solved: validateSlitherlink(level, state.marks).complete
    };
  }

  if (isMejilinkLevel(level)) {
    const solution = new Set<string>(level.solutionEdges);
    const progress = mejilinkProgress(level, state.marks);
    return {
      ...EMPTY_PROGRESS,
      correctLines: Object.entries(state.marks).filter(
        ([edge, mark]) => mark === "line" && solution.has(edge)
      ).length,
      correctCrosses: Object.entries(state.marks).filter(
        ([edge, mark]) => mark === "cross" && !solution.has(edge)
      ).length,
      matchedClues: progress.matchedRegions,
      solved: validateMejilink(level, state.marks).complete
    };
  }

  if (isCellLoopLevel(level)) {
    const marks: EdgeMap = {
      ...state.marks,
      ...Object.fromEntries(
        [...level.prefilledEdges, ...pipeClueEdges(level)].map((edge) => [
          edge,
          "line" as const
        ])
      )
    };
    const solution = new Set<string>([
      ...level.solutionEdges,
      ...level.prefilledEdges,
      ...pipeClueEdges(level)
    ]);
    const progress = cellLoopProgress(level, marks);
    return {
      ...EMPTY_PROGRESS,
      correctLines: Object.entries(marks).filter(
        ([edge, mark]) => mark === "line" && solution.has(edge)
      ).length,
      correctCrosses: Object.entries(marks).filter(
        ([edge, mark]) => mark === "cross" && !solution.has(edge)
      ).length,
      matchedClues: progress.matchedClues,
      coveredCells: progress.visitedCells,
      solved: validateCellLoop(level, marks).complete
    };
  }

  if (isThermometerLevel(level)) {
    const counts = thermometerCounts(level, state.thermometers);
    return {
      ...EMPTY_PROGRESS,
      filledCells: counts.total,
      matchedCounts:
        counts.rows.filter((count, row) => count === level.rowTargets[row])
          .length +
        counts.cols.filter((count, col) => count === level.colTargets[col])
          .length,
      solved: validateThermometers(level, state.thermometers).complete
    };
  }

  if (isHashiLevel(level)) {
    const progress = hashiProgress(level, state.bridges);
    return {
      ...EMPTY_PROGRESS,
      bridgeRoutes: Object.keys(state.bridges).length,
      doubleBridges: Object.values(state.bridges).filter(
        (count) => count === 2
      ).length,
      matchedIslands: progress.matched,
      solved: validateHashi(level, state.bridges).complete
    };
  }

  return EMPTY_PROGRESS;
}

export function isTutorialStepComplete(
  step: TutorialStep,
  before: TutorialProgress,
  after: TutorialProgress
): boolean {
  if (step.requirement.type === "solve") return after.solved;
  const { metric } = step.requirement;
  return step.requirement.type === "increase"
    ? after[metric] > before[metric]
    : after[metric] < before[metric];
}

type InteractiveTutorialProps = {
  chapterLabel: string;
  levelId: number;
  mode: PuzzleMode;
  progress: TutorialProgress;
  onDismiss: () => void;
};

export default function InteractiveTutorial({
  chapterLabel,
  levelId,
  mode,
  progress,
  onDismiss
}: InteractiveTutorialProps) {
  const steps = getTutorialSteps(mode, levelId);
  const [stepIndex, setStepIndex] = useState(0);
  const baseline = useRef(progress);
  const step = steps[stepIndex];

  useEffect(() => {
    if (!isTutorialStepComplete(step, baseline.current, progress)) return;
    if (stepIndex === steps.length - 1) {
      onDismiss();
      return;
    }
    baseline.current = progress;
    setStepIndex((current) => current + 1);
  }, [onDismiss, progress, step, stepIndex, steps.length]);

  const dots = useMemo(
    () =>
      steps.map((_, index) => (
        <span
          key={index}
          className={index <= stepIndex ? "is-active" : ""}
          aria-hidden="true"
        />
      )),
    [stepIndex, steps]
  );

  return (
    <section
      className="tutorial-coach"
      data-tutorial-target={step.target}
      aria-live="polite"
      aria-label={`${chapterLabel}交互教学`}
    >
      <header>
        <div>
          <span className="tutorial-kicker">交互教学</span>
          <span className="tutorial-count">
            {stepIndex + 1}/{steps.length}
          </span>
        </div>
        <button
          type="button"
          title="跳过教学"
          aria-label="跳过教学"
          onClick={onDismiss}
        >
          <X size={16} />
        </button>
      </header>
      <div className="tutorial-progress" aria-hidden="true">
        {dots}
      </div>
      <div className="tutorial-copy" key={`${mode}:${stepIndex}`}>
        <span className="tutorial-step-icon">
          <Check size={15} />
        </span>
        <div>
          <strong>{step.title}</strong>
          <p>{step.instruction}</p>
        </div>
      </div>
    </section>
  );
}
