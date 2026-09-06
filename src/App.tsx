import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Check,
  Grid3X3,
  Lightbulb,
  Redo2,
  RotateCcw,
  Undo2,
  X
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent
} from "react";
import {
  cellOwners,
  clonePaths,
  completedColorCount,
  endpointColorAt,
  isAdjacent,
  pathConnectsEndpoints,
  pathIsComplete,
  pointKey,
  samePoint,
  validateBoard,
  type NumberlinkLevel,
  type PathMap,
  type Point
} from "./game";
import { NUMBERLINK_LEVELS } from "./levels";
import { NUMBER_END_LEVELS } from "./numberEndLevels";
import SlitherlinkGame from "./SlitherlinkGame";
import { SLITHERLINK_LEVELS } from "./slitherlinkLevels";
import {
  isSlitherlinkLevel,
  type EdgeMap
} from "./slitherlink";
import { parseDebugOptions } from "./debug";
import { MEJILINK_LEVELS } from "./mejilinkLevels";
import { isMejilinkLevel } from "./mejilink";
import CellLoopGame from "./CellLoopGame";
import {
  BALANCE_LOOP_LEVELS,
  GERADEWEG_LEVELS,
  MASYU_LEVELS,
  MIDLOOP_LEVELS,
  PIPELINK_LEVELS,
  SHINGOKI_LEVELS
} from "./cellLoopLevels";
import { isCellLoopLevel } from "./cellLoop";
import ThermometerGame from "./ThermometerGame";
import { THERMOMETER_LEVELS } from "./thermometerLevels";
import {
  isThermometerLevel,
  type ThermometerState
} from "./thermometers";
import HashiGame from "./HashiGame";
import { HASHI_LEVELS } from "./hashiLevels";
import { isHashiLevel, type BridgeMap } from "./hashi";
import WinOverlay from "./WinOverlay";
import InteractiveTutorial, {
  getTutorialProgress,
  hasInteractiveTutorial
} from "./InteractiveTutorial";
import RulesModal from "./RulesModal";
import { useCompletionSound } from "./useCompletionSound";
import CatMascot from "./CatMascot";

const SAVE_KEY = "line-puzzle-numberlink-v1";
const LEVEL_DATA_REVISION = 18;
const ALL_LEVELS = [
  ...NUMBERLINK_LEVELS,
  ...NUMBER_END_LEVELS,
  ...SLITHERLINK_LEVELS,
  ...MEJILINK_LEVELS,
  ...PIPELINK_LEVELS,
  ...THERMOMETER_LEVELS,
  ...HASHI_LEVELS,
  ...MASYU_LEVELS,
  ...MIDLOOP_LEVELS,
  ...BALANCE_LOOP_LEVELS,
  ...GERADEWEG_LEVELS,
  ...SHINGOKI_LEVELS
];
const CHAPTERS = [
  { id: 1, title: "数连", levels: NUMBERLINK_LEVELS },
  { id: 2, title: "定长数连", levels: NUMBER_END_LEVELS },
  { id: 3, title: "数回", levels: SLITHERLINK_LEVELS },
  { id: 4, title: "区域环", levels: MEJILINK_LEVELS },
  { id: 5, title: "管道回路", levels: PIPELINK_LEVELS },
  { id: 6, title: "温度计", levels: THERMOMETER_LEVELS },
  { id: 7, title: "数桥", levels: HASHI_LEVELS },
  { id: 8, title: "珍珠", levels: MASYU_LEVELS },
  { id: 9, title: "中环", levels: MIDLOOP_LEVELS },
  { id: 10, title: "平衡环", levels: BALANCE_LOOP_LEVELS },
  { id: 11, title: "直线环路", levels: GERADEWEG_LEVELS },
  { id: 12, title: "交通灯", levels: SHINGOKI_LEVELS }
] as const;
const CHAPTER_LABELS = [
  "",
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
  "十",
  "十一",
  "十二"
] as const;
type SavedProgress = {
  revision?: number;
  currentLevel: number;
  unlocked: number;
  solved: number[];
  tutorialsSeen?: number[];
  tutorialLevelsSeen?: number[];
  paths: Record<number, PathMap>;
  edges?: Record<number, EdgeMap>;
  thermometers?: Record<number, ThermometerState>;
  bridges?: Record<number, BridgeMap>;
};

function emptyPaths(level: NumberlinkLevel): PathMap {
  return Object.fromEntries(level.colors.map((color) => [color.id, []]));
}

function isNumberPathLevel(level: NumberlinkLevel): boolean {
  return level.mode === "numberlink" || level.mode === "number-end";
}

function shouldStartTutorial(
  level: NumberlinkLevel,
  solved: number[],
  tutorialLevelsSeen: number[]
): boolean {
  return (
    hasInteractiveTutorial(level.id) &&
    !solved.includes(level.id) &&
    !tutorialLevelsSeen.includes(level.id)
  );
}

function isChapterOpeningLevel(level: NumberlinkLevel): boolean {
  return (
    CHAPTERS.find((chapter) => chapter.id === level.chapter)?.levels[0]?.id ===
    level.id
  );
}

function isLevelUnlocked(level: NumberlinkLevel, unlocked: number): boolean {
  return level.id <= unlocked || isChapterOpeningLevel(level);
}

function loadProgress(): SavedProgress {
  try {
    const value = localStorage.getItem(SAVE_KEY);
    if (!value) throw new Error("No save");
    const parsed = JSON.parse(value) as SavedProgress;
    const firstChapterChanged = (parsed.revision ?? 1) < 2;
    const finalSlitherlinkLevelsChanged = (parsed.revision ?? 1) < 5;
    const mejilinkLevelsChanged = (parsed.revision ?? 1) < 7;
    const pipelinkLevelsChanged = (parsed.revision ?? 1) < 9;
    const thermometerLevelsChanged = (parsed.revision ?? 1) < 10;
    const hashiLevelsChanged = (parsed.revision ?? 1) < 12;
    const masyuLevelsChanged = (parsed.revision ?? 1) < 13;
    const finalMasyuLevelChanged = (parsed.revision ?? 1) < 15;
    const paths = firstChapterChanged
      ? Object.fromEntries(
          Object.entries(parsed.paths ?? {}).filter(([id]) => Number(id) < 7)
        )
      : parsed.paths ?? {};
    const solved = Array.isArray(parsed.solved)
      ? parsed.solved.filter(
          (id) =>
            (!firstChapterChanged || id < 7) &&
            (!finalSlitherlinkLevelsChanged || id < 27) &&
            (!mejilinkLevelsChanged || id < 29 || id > 36) &&
            (!pipelinkLevelsChanged || id < 37 || id > 44) &&
            (!thermometerLevelsChanged || id < 45 || id > 52) &&
            (!hashiLevelsChanged || id < 53 || id > 60) &&
            (!masyuLevelsChanged || id < 61 || id > 68) &&
            (!finalMasyuLevelChanged || id !== 68)
        )
      : [];
    const firstChapterComplete = NUMBERLINK_LEVELS.every((level) =>
      solved.includes(level.id)
    );
    const secondChapterComplete = NUMBER_END_LEVELS.every((level) =>
      solved.includes(level.id)
    );
    let nextUnsolved = 1;
    while (solved.includes(nextUnsolved) && nextUnsolved < ALL_LEVELS.length) {
      nextUnsolved += 1;
    }
    const tutorialLevelsSeen = Array.isArray(parsed.tutorialLevelsSeen)
      ? parsed.tutorialLevelsSeen
      : (parsed.tutorialsSeen ?? [])
          .map(
            (chapterId) =>
              CHAPTERS.find((chapter) => chapter.id === chapterId)?.levels[0]?.id
          )
          .filter((id): id is number => id !== undefined);
    return {
      revision: LEVEL_DATA_REVISION,
      currentLevel: Math.min(
        Math.max(parsed.currentLevel ?? 1, 1),
        ALL_LEVELS.length
      ),
      unlocked: Math.min(
        Math.max(
          parsed.unlocked ?? 1,
          firstChapterComplete ? 11 : 1,
          secondChapterComplete ? 19 : 1,
          nextUnsolved
        ),
        ALL_LEVELS.length
      ),
      solved,
      tutorialsSeen: Array.isArray(parsed.tutorialsSeen)
        ? parsed.tutorialsSeen
        : [],
      tutorialLevelsSeen,
      paths,
      edges: Object.fromEntries(
        Object.entries(parsed.edges ?? {}).filter(([id]) => {
          const levelId = Number(id);
          return (
            (!finalSlitherlinkLevelsChanged || levelId < 27) &&
            (!mejilinkLevelsChanged || levelId < 29 || levelId > 36) &&
            (!pipelinkLevelsChanged || levelId < 37 || levelId > 44) &&
            (!hashiLevelsChanged || levelId !== 60) &&
            (!masyuLevelsChanged || levelId < 61 || levelId > 68) &&
            (!finalMasyuLevelChanged || levelId !== 68)
          );
        })
      ),
      thermometers: Object.fromEntries(
        Object.entries(parsed.thermometers ?? {}).filter(([id]) => {
          const levelId = Number(id);
          return !thermometerLevelsChanged || levelId < 45 || levelId > 52;
        })
      ),
      bridges: Object.fromEntries(
        Object.entries(parsed.bridges ?? {}).filter(([id]) => {
          const levelId = Number(id);
          return !hashiLevelsChanged || levelId < 53 || levelId > 60;
        })
      )
    };
  } catch {
    return {
      revision: LEVEL_DATA_REVISION,
      currentLevel: 1,
      unlocked: 1,
      solved: [],
      tutorialsSeen: [],
      tutorialLevelsSeen: [],
      paths: {},
      edges: {},
      thermometers: {},
      bridges: {}
    };
  }
}

function pathsMatch(a: Point[], b: Point[]): boolean {
  if (a.length !== b.length) return false;
  const forward = a.every((point, index) => samePoint(point, b[index]));
  const backward = a.every((point, index) =>
    samePoint(point, b[b.length - 1 - index])
  );
  return forward || backward;
}

function endpointFurColor(colorId: string, fallback: string): string {
  const furColors: Record<string, string> = {
    coral: "#f98783",
    teal: "#55cdb9",
    gold: "#f7ca51",
    blue: "#78a7e4",
    berry: "#d77aa5",
    leaf: "#8bc57b"
  };
  return furColors[colorId] ?? fallback;
}

function EndpointGlyph({
  colorId,
  color,
  label
}: {
  colorId: string;
  color: string;
  label?: number;
}) {
  return (
    <g className="cat-endpoint-glyph">
      <path
        className="cat-endpoint-head"
        d="M .18 .43 L .14 .16 Q .14 .1 .2 .13 L .36 .23 Q .5 .17 .64 .23 L .8 .13 Q .86 .1 .86 .16 L .82 .43 Q .9 .51 .87 .67 Q .83 .87 .5 .89 Q .17 .87 .13 .67 Q .1 .51 .18 .43 Z"
        fill={endpointFurColor(colorId, color)}
      />
      <path className="cat-endpoint-ear" d="M .2 .2 L .23 .36 L .34 .27 Z" />
      <path className="cat-endpoint-ear" d="M .8 .2 L .77 .36 L .66 .27 Z" />
      {label !== undefined && (
        <text
          className="endpoint-number"
          x=".5"
          y=".33"
          fontSize={label > 9 ? 0.17 : 0.21}
        >
          {label}
        </text>
      )}
      <ellipse className="cat-endpoint-eye" cx=".34" cy=".55" rx=".045" ry=".06" />
      <ellipse className="cat-endpoint-eye" cx=".66" cy=".55" rx=".045" ry=".06" />
      <path className="cat-endpoint-nose" d="M .5 .63 L .46 .6 H .54 Z" />
      <path className="cat-endpoint-mouth" d="M .5 .63 V .66 M .5 .66 Q .45 .71 .41 .67 M .5 .66 Q .55 .71 .59 .67" />
      <path className="cat-endpoint-whisker" d="M .31 .64 L .15 .61 M .31 .69 L .14 .72 M .69 .64 L .85 .61 M .69 .69 L .86 .72" />
    </g>
  );
}

function endpointTransform(point: Point): string {
  return `translate(${point.col} ${point.row})`;
}

function pathPoints(path: Point[]): string {
  return path.map((point) => `${point.col + 0.5},${point.row + 0.5}`).join(" ");
}

function NumberlinkBoard({
  level,
  paths,
  activeColor,
  invalidCell,
  solved,
  onPointerDown,
  onPointerMove,
  onPointerUp
}: {
  level: NumberlinkLevel;
  paths: PathMap;
  activeColor: string | null;
  invalidCell: string | null;
  solved: boolean;
  onPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerUp: (event: ReactPointerEvent<SVGSVGElement>) => void;
}) {
  const cells = useMemo(
    () =>
      Array.from({ length: level.rows * level.cols }, (_, index) => ({
        row: Math.floor(index / level.cols),
        col: index % level.cols
      })),
    [level]
  );

  return (
    <div
      className={`board-shell ${activeColor ? "is-interacting" : ""} ${
        solved ? "is-solved" : ""
      }`}
      style={{ aspectRatio: `${level.cols} / ${level.rows}` }}
    >
      <svg
        className="numberlink-board"
        viewBox={`0 0 ${level.cols} ${level.rows}`}
        role="application"
        aria-label={`第 ${level.id} 关 ${level.chapterTitle}棋盘`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(event) => event.preventDefault()}
      >
        <rect
          className="board-background"
          width={level.cols}
          height={level.rows}
          rx=".1"
        />

        {cells.map((cell) => (
          <rect
            key={pointKey(cell)}
            className={`board-cell ${
              (cell.row + cell.col) % 2 === 0 ? "is-tinted" : ""
            }`}
            x={cell.col}
            y={cell.row}
            width="1"
            height="1"
          />
        ))}

        {Array.from({ length: level.cols - 1 }, (_, index) => (
          <line
            className="grid-line"
            key={`v-${index}`}
            x1={index + 1}
            x2={index + 1}
            y1="0"
            y2={level.rows}
          />
        ))}
        {Array.from({ length: level.rows - 1 }, (_, index) => (
          <line
            className="grid-line"
            key={`h-${index}`}
            x1="0"
            x2={level.cols}
            y1={index + 1}
            y2={index + 1}
          />
        ))}

        {invalidCell && (() => {
          const [row, col] = invalidCell.split(":").map(Number);
          return (
            <rect
              className="invalid-cell"
              x={col + 0.08}
              y={row + 0.08}
              width=".84"
              height=".84"
              rx=".16"
            />
          );
        })()}

        {level.colors.map((color) => {
          const path = paths[color.id] ?? [];
          if (path.length < 2) return null;
          const complete = pathIsComplete(level, color.id, path);
          return (
            <g
              key={`path-${color.id}`}
              className={`flow-path ${complete ? "is-complete" : ""} ${
                activeColor === color.id ? "is-active" : ""
              }`}
            >
              <polyline
                className="flow-halo"
                points={pathPoints(path)}
                stroke={color.soft}
              />
              <polyline
                className="flow-line"
                points={pathPoints(path)}
                stroke={color.value}
              />
            </g>
          );
        })}

        {level.colors.flatMap((color) =>
          level.endpoints[color.id].map((endpoint, index) => (
            <g
              key={`${color.id}-${index}`}
              transform={endpointTransform(endpoint)}
            >
              <g
                className={`endpoint endpoint-${color.shape} ${
                  activeColor === color.id ? "is-active" : ""
                }`}
              >
                {level.mode === "number-end" ? (
                  <EndpointGlyph
                    colorId={color.id}
                    color={color.value}
                    label={level.targetLengths?.[color.id]}
                  />
                ) : (
                  <EndpointGlyph colorId={color.id} color={color.value} />
                )}
              </g>
            </g>
          ))
        )}
      </svg>
      {activeColor &&
        level.targetLengths?.[activeColor] &&
        paths[activeColor]?.length > 0 &&
        !pathIsComplete(level, activeColor, paths[activeColor]) && (
        <div
          className={`active-length ${
            paths[activeColor].length === level.targetLengths[activeColor]
              ? "is-at-limit"
              : ""
          } ${paths[activeColor].at(-1)!.row === 0 ? "is-below" : ""}`}
          style={{
            left: `${((paths[activeColor].at(-1)!.col + 0.5) / level.cols) * 100}%`,
            top: `${((paths[activeColor].at(-1)!.row + 0.5) / level.rows) * 100}%`
          }}
          aria-live="polite"
        >
          {paths[activeColor].length}/{level.targetLengths[activeColor]}
        </div>
      )}
      <div className="completion-sweep" aria-hidden="true" />
    </div>
  );
}

export default function App() {
  const debugOptions = useMemo(
    () => parseDebugOptions(window.location.search, ALL_LEVELS.length),
    []
  );
  const debugMode = debugOptions.enabled;
  const initialSave = useMemo(loadProgress, []);
  const [levelIndex, setLevelIndex] = useState(
    (debugOptions.levelId ?? initialSave.currentLevel) - 1
  );
  const level = ALL_LEVELS[levelIndex];
  const [paths, setPaths] = useState<PathMap>(
    () => clonePaths(initialSave.paths[level.id] ?? emptyPaths(level))
  );
  const [edgeTutorialMarks, setEdgeTutorialMarks] = useState<EdgeMap>(
    () => ({ ...(initialSave.edges?.[level.id] ?? {}) })
  );
  const [thermometerTutorialState, setThermometerTutorialState] =
    useState<ThermometerState>(
      () => ({ ...(initialSave.thermometers?.[level.id] ?? {}) })
    );
  const [bridgeTutorialState, setBridgeTutorialState] = useState<BridgeMap>(
    () => ({ ...(initialSave.bridges?.[level.id] ?? {}) })
  );
  const [unlocked, setUnlocked] = useState(initialSave.unlocked);
  const [solvedLevels, setSolvedLevels] = useState<number[]>(initialSave.solved);
  const [tutorialLevelsSeen, setTutorialLevelsSeen] = useState<number[]>(
    initialSave.tutorialLevelsSeen ?? []
  );
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const activePointerId = useRef<number | null>(null);
  const [invalidCell, setInvalidCell] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<PathMap[]>([]);
  const [redoStack, setRedoStack] = useState<PathMap[]>([]);
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const [pickerChapter, setPickerChapter] =
    useState<NumberlinkLevel["chapter"]>(level.chapter);
  const [won, setWon] = useState(
    () => isNumberPathLevel(level) && validateBoard(level, paths).complete
  );
  const invalidTimer = useRef<number | undefined>(undefined);
  const lastInvalidCell = useRef<string | null>(null);
  const feedbackTimer = useRef<number | undefined>(undefined);
  const [feedback, setFeedback] = useState("");
  const [tutorialRun, setTutorialRun] = useState(0);
  const [gameInstance, setGameInstance] = useState(0);
  const [forceFreshState, setForceFreshState] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(() => {
    const tutorialPending = shouldStartTutorial(
      level,
      initialSave.solved,
      initialSave.tutorialLevelsSeen ?? []
    );
    return tutorialPending && isChapterOpeningLevel(level);
  });
  const [tutorialActive, setTutorialActive] = useState(() => {
    const tutorialPending = shouldStartTutorial(
      level,
      initialSave.solved,
      initialSave.tutorialLevelsSeen ?? []
    );
    return tutorialPending && !isChapterOpeningLevel(level);
  });

  const currentChapter = CHAPTERS.find((chapter) => chapter.id === level.chapter)!;
  const chapterLevels = currentChapter.levels;
  const selectedChapter = CHAPTERS.find(
    (chapter) => chapter.id === pickerChapter
  )!;
  const owners = useMemo(() => cellOwners(paths), [paths]);
  const filledCount = owners.size;
  const totalCells = level.rows * level.cols;
  const connectedCount = completedColorCount(level, paths);
  const tutorialProgress = useMemo(
    () =>
      getTutorialProgress(level, {
        paths,
        marks: edgeTutorialMarks,
        thermometers: thermometerTutorialState,
        bridges: bridgeTutorialState
      }),
    [
      bridgeTutorialState,
      edgeTutorialMarks,
      level,
      paths,
      thermometerTutorialState
    ]
  );
  useCompletionSound(level.id, isNumberPathLevel(level) && won);

  useEffect(() => {
    document.title = `${currentChapter.title} · 猫咪连线`;
  }, [currentChapter.title]);

  const persist = useCallback(
    (
      nextPaths: PathMap,
      nextLevel = level,
      nextUnlocked = unlocked,
      nextSolved = solvedLevels
    ) => {
      if (debugMode) return;
      const current = loadProgress();
      const save: SavedProgress = {
        revision: LEVEL_DATA_REVISION,
        currentLevel: nextLevel.id,
        unlocked: nextUnlocked,
        solved: nextSolved,
        tutorialsSeen: current.tutorialsSeen ?? [],
        tutorialLevelsSeen: current.tutorialLevelsSeen ?? [],
        paths: {
          ...current.paths,
          [nextLevel.id]: clonePaths(nextPaths)
        },
        edges: current.edges ?? {},
        thermometers: current.thermometers ?? {},
        bridges: current.bridges ?? {}
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    },
    [debugMode, level, solvedLevels, unlocked]
  );

  useEffect(() => {
    if (!isNumberPathLevel(level)) return;
    persist(paths);
  }, [paths, persist]);

  useEffect(() => {
    if (!isNumberPathLevel(level)) return;
    const complete = validateBoard(level, paths).complete;
    setWon(complete);

    if (!complete || solvedLevels.includes(level.id)) return;

    const nextSolved = [...solvedLevels, level.id].sort((a, b) => a - b);
    const nextUnlocked = Math.min(
      Math.max(unlocked, level.id + 1),
      ALL_LEVELS.length
    );
    setSolvedLevels(nextSolved);
    setUnlocked(nextUnlocked);
    persist(paths, level, nextUnlocked, nextSolved);
    navigator.vibrate?.([20, 40, 35]);
  }, [level, paths, persist, solvedLevels, unlocked]);

  const persistEdgePuzzle = useCallback(
    (nextMarks: EdgeMap, complete: boolean) => {
      setEdgeTutorialMarks({ ...nextMarks });
      if (
        !isSlitherlinkLevel(level) &&
        !isMejilinkLevel(level) &&
        !isCellLoopLevel(level)
      ) {
        return;
      }
      const current = loadProgress();
      const wasSolved = solvedLevels.includes(level.id);
      const nextSolved =
        complete && !wasSolved
          ? [...solvedLevels, level.id].sort((a, b) => a - b)
          : solvedLevels;
      const nextUnlocked = complete
        ? Math.min(Math.max(unlocked, level.id + 1), ALL_LEVELS.length)
        : unlocked;

      if (!debugMode) {
        localStorage.setItem(
          SAVE_KEY,
          JSON.stringify({
            revision: LEVEL_DATA_REVISION,
            currentLevel: level.id,
            unlocked: nextUnlocked,
            solved: nextSolved,
            tutorialsSeen: current.tutorialsSeen ?? [],
            tutorialLevelsSeen: current.tutorialLevelsSeen ?? [],
            paths: current.paths,
            edges: {
              ...(current.edges ?? {}),
              [level.id]: { ...nextMarks }
            },
            thermometers: current.thermometers ?? {},
            bridges: current.bridges ?? {}
          } satisfies SavedProgress)
        );
      }

      if (complete && !wasSolved) {
        setSolvedLevels(nextSolved);
        setUnlocked(nextUnlocked);
        navigator.vibrate?.([20, 40, 35]);
      }
    },
    [debugMode, level, solvedLevels, unlocked]
  );

  const persistThermometer = useCallback(
    (nextState: ThermometerState, complete: boolean) => {
      setThermometerTutorialState({ ...nextState });
      if (!isThermometerLevel(level)) return;
      const current = loadProgress();
      const wasSolved = solvedLevels.includes(level.id);
      const nextSolved =
        complete && !wasSolved
          ? [...solvedLevels, level.id].sort((a, b) => a - b)
          : solvedLevels;
      const nextUnlocked = complete
        ? Math.min(Math.max(unlocked, level.id + 1), ALL_LEVELS.length)
        : unlocked;
      if (!debugMode) {
        localStorage.setItem(
          SAVE_KEY,
          JSON.stringify({
            ...current,
            revision: LEVEL_DATA_REVISION,
            currentLevel: level.id,
            unlocked: nextUnlocked,
            solved: nextSolved,
            thermometers: {
              ...(current.thermometers ?? {}),
              [level.id]: { ...nextState }
            }
          } satisfies SavedProgress)
        );
      }
      if (complete && !wasSolved) {
        setSolvedLevels(nextSolved);
        setUnlocked(nextUnlocked);
        navigator.vibrate?.([20, 40, 35]);
      }
    },
    [debugMode, level, solvedLevels, unlocked]
  );

  const persistHashi = useCallback(
    (nextBridges: BridgeMap, complete: boolean) => {
      setBridgeTutorialState({ ...nextBridges });
      if (!isHashiLevel(level)) return;
      const current = loadProgress();
      const wasSolved = solvedLevels.includes(level.id);
      const nextSolved =
        complete && !wasSolved
          ? [...solvedLevels, level.id].sort((a, b) => a - b)
          : solvedLevels;
      const nextUnlocked = complete
        ? Math.min(Math.max(unlocked, level.id + 1), ALL_LEVELS.length)
        : unlocked;
      if (!debugMode) {
        localStorage.setItem(
          SAVE_KEY,
          JSON.stringify({
            ...current,
            revision: LEVEL_DATA_REVISION,
            currentLevel: level.id,
            unlocked: nextUnlocked,
            solved: nextSolved,
            bridges: {
              ...(current.bridges ?? {}),
              [level.id]: { ...nextBridges }
            }
          } satisfies SavedProgress)
        );
      }
      if (complete && !wasSolved) {
        setSolvedLevels(nextSolved);
        setUnlocked(nextUnlocked);
        navigator.vibrate?.([20, 40, 35]);
      }
    },
    [debugMode, level, solvedLevels, unlocked]
  );

  useEffect(
    () => () => {
      if (invalidTimer.current) window.clearTimeout(invalidTimer.current);
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    },
    []
  );

  const pointFromEvent = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>): Point | null => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
      return {
        row: Math.min(level.rows - 1, Math.floor((y / rect.height) * level.rows)),
        col: Math.min(level.cols - 1, Math.floor((x / rect.width) * level.cols))
      };
    },
    [level.cols, level.rows]
  );

  const pulseInvalid = useCallback((point: Point, message = "") => {
    const key = pointKey(point);
    if (lastInvalidCell.current === key) return;
    lastInvalidCell.current = key;
    if (invalidTimer.current) window.clearTimeout(invalidTimer.current);
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    setInvalidCell(key);
    setFeedback(message);
    navigator.vibrate?.([15, 30, 15]);
    invalidTimer.current = window.setTimeout(() => {
      setInvalidCell(null);
      lastInvalidCell.current = null;
    }, 400);
    feedbackTimer.current = window.setTimeout(() => setFeedback(""), 1400);
  }, []);

  const startPath = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (won) return;
      const point = pointFromEvent(event);
      if (!point) return;

      // 1. 如果点击的是固定端点，清除该颜色的线并重新开始
      const epColor = endpointColorAt(level, point);
      if (epColor) {
        activePointerId.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        setUndoStack((stack) => [...stack, clonePaths(paths)]);
        setRedoStack([]);
        setPaths((current) => ({ ...current, [epColor]: [point] }));
        setActiveColor(epColor);
        navigator.vibrate?.(6);
        return;
      }

      // 2. 如果点击的是已经存在的线（端点续连 / 局部擦除）
      for (const color of level.colors) {
        const path = paths[color.id] ?? [];
        const index = path.findIndex((p) => samePoint(p, point));
        if (index >= 0) {
          activePointerId.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          setUndoStack((stack) => [...stack, clonePaths(paths)]);
          setRedoStack([]);
          // 从点击的位置截断后面的线（擦除），并将其作为新的端点准备续连
          setPaths((current) => ({ ...current, [color.id]: path.slice(0, index + 1) }));
          setActiveColor(color.id);
          navigator.vibrate?.(6);
          return;
        }
      }

      pulseInvalid(point);
    },
    [level, paths, pointFromEvent, pulseInvalid, won]
  );

  const extendPath = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!activeColor || event.pointerId !== activePointerId.current) return;
      const point = pointFromEvent(event);
      if (!point) return;

      setPaths((current) => {
        const path = current[activeColor] ?? [];
        const last = path[path.length - 1];
        if (!last || samePoint(last, point)) return current;

        // 仅允许逐格回退，防止由于坐标偏移导致整条路径意外截断（点乱跳）
        if (path.length > 1 && samePoint(path[path.length - 2], point)) {
          return { ...current, [activeColor]: path.slice(0, -1) };
        }

        // 撞到自己的其他部分时，视为非法操作，而不是大规模截断
        const existingIndex = path.findIndex((entry) => samePoint(entry, point));
        if (existingIndex >= 0) {
          pulseInvalid(point);
          return current;
        }

        if (!isAdjacent(last, point)) return current;
        if (pathConnectsEndpoints(level, activeColor, path)) {
          pulseInvalid(point, "路径已经完成");
          return current;
        }

        const targetLength = level.targetLengths?.[activeColor];
        if (targetLength !== undefined && path.length >= targetLength) {
          pulseInvalid(last, `已达到 ${targetLength} 格，请回退调整`);
          return current;
        }

        const endpointColor = endpointColorAt(level, point);
        if (endpointColor && endpointColor !== activeColor) {
          // 不能穿过其他颜色的固定端点
          pulseInvalid(
            point,
            level.mode === "number-end" ? "这里只能连接相同数字" : "这里只能连接同色端点"
          );
          return current;
        }

        const nextLength = path.length + 1;
        if (
          targetLength !== undefined &&
          endpointColor === activeColor &&
          nextLength < targetLength
        ) {
          pulseInvalid(point, `还差 ${targetLength - nextLength} 格`);
          return current;
        }

        const occupiedBy = cellOwners(current).get(pointKey(point));
        if (occupiedBy && occupiedBy !== activeColor) {
          pulseInvalid(point, "路径不能重叠");
          return current;
        }

        return { ...current, [activeColor]: [...path, point] };
      });
    },
    [activeColor, level, pointFromEvent, pulseInvalid]
  );

  const stopPath = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      setActiveColor(null);
      activePointerId.current = null;
    },
    []
  );

  const dismissTutorial = useCallback(() => {
    setTutorialActive(false);
    if (tutorialLevelsSeen.includes(level.id)) return;

    const nextTutorialLevelsSeen = [...tutorialLevelsSeen, level.id].sort(
      (a, b) => a - b
    );
    setTutorialLevelsSeen(nextTutorialLevelsSeen);
    if (debugMode) return;

    const current = loadProgress();
    localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        ...current,
        tutorialLevelsSeen: nextTutorialLevelsSeen
      } satisfies SavedProgress)
    );
  }, [debugMode, level.id, tutorialLevelsSeen]);

  const startTutorial = useCallback(() => {
    setRulesOpen(false);
    if (!hasInteractiveTutorial(level.id)) return;

    if (tutorialProgress.solved) {
      setForceFreshState(true);
      setGameInstance((current) => current + 1);
      setPaths(emptyPaths(level));
      setEdgeTutorialMarks({});
      setThermometerTutorialState({});
      setBridgeTutorialState({});
      setUndoStack([]);
      setRedoStack([]);
      setActiveColor(null);
      setWon(false);
    }

    setTutorialRun((current) => current + 1);
    setTutorialActive(true);
  }, [level, tutorialProgress.solved]);

  const openRules = useCallback(() => {
    setTutorialActive(false);
    setRulesOpen(true);
  }, []);

  const selectLevel = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= ALL_LEVELS.length) {
        return;
      }
      const nextLevel = ALL_LEVELS[nextIndex];
      if (!debugMode && !isLevelUnlocked(nextLevel, unlocked)) return;

      const saved = loadProgress();
      const nextPaths = clonePaths(
        saved.paths[nextLevel.id] ?? emptyPaths(nextLevel)
      );
      setLevelIndex(nextIndex);
      setPaths(nextPaths);
      setEdgeTutorialMarks({ ...(saved.edges?.[nextLevel.id] ?? {}) });
      setThermometerTutorialState({
        ...(saved.thermometers?.[nextLevel.id] ?? {})
      });
      setBridgeTutorialState({ ...(saved.bridges?.[nextLevel.id] ?? {}) });
      setUndoStack([]);
      setRedoStack([]);
      setActiveColor(null);
      setFeedback("");
      setForceFreshState(false);
      setWon(
        isNumberPathLevel(nextLevel) &&
          validateBoard(nextLevel, nextPaths).complete
      );
      setLevelPickerOpen(false);
      setPickerChapter(nextLevel.chapter);
      setTutorialRun((current) => current + 1);
      const tutorialPending = shouldStartTutorial(
        nextLevel,
        solvedLevels,
        tutorialLevelsSeen
      );
      setTutorialActive(
        tutorialPending && !isChapterOpeningLevel(nextLevel)
      );
      setRulesOpen(tutorialPending && isChapterOpeningLevel(nextLevel));
      if (debugMode) {
        const url = new URL(window.location.href);
        url.searchParams.set("debug", "1");
        url.searchParams.set("level", String(nextLevel.id));
        window.history.replaceState(null, "", url);
      }
      persist(nextPaths, nextLevel);
    },
    [debugMode, persist, solvedLevels, tutorialLevelsSeen, unlocked]
  );

  const undo = useCallback(() => {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    setRedoStack((stack) => [...stack, clonePaths(paths)]);
    setPaths(clonePaths(previous));
    setUndoStack((stack) => stack.slice(0, -1));
    setActiveColor(null);
    setFeedback("");
  }, [paths, undoStack]);

  const redo = useCallback(() => {
    const next = redoStack[redoStack.length - 1];
    if (!next) return;
    setUndoStack((stack) => [...stack, clonePaths(paths)]);
    setPaths(clonePaths(next));
    setRedoStack((stack) => stack.slice(0, -1));
    setActiveColor(null);
    setFeedback("");
  }, [paths, redoStack]);

  const reset = useCallback(() => {
    if (filledCount === 0) return;
    setUndoStack((stack) => [...stack, clonePaths(paths)]);
    setRedoStack([]);
    setPaths(emptyPaths(level));
    setActiveColor(null);
    setFeedback("");
  }, [filledCount, level, paths]);

  const hint = useCallback(() => {
    const targetColor =
      level.colors.find(
        (color) =>
          !pathsMatch(paths[color.id] ?? [], level.solution[color.id])
      ) ?? level.colors[0];
    const targetCells = new Set(
      level.solution[targetColor.id].map((point) => pointKey(point))
    );
    const next = clonePaths(paths);

    level.colors.forEach((color) => {
      if (color.id === targetColor.id) return;
      if (next[color.id].some((point) => targetCells.has(pointKey(point)))) {
        next[color.id] = [];
      }
    });
    next[targetColor.id] = clonePaths({
      [targetColor.id]: level.solution[targetColor.id]
    })[targetColor.id];

    setUndoStack((stack) => [...stack, clonePaths(paths)]);
    setRedoStack([]);
    setPaths(next);
    setActiveColor(null);
    setFeedback("");
  }, [level, paths]);

  const goNext = useCallback(() => {
    if (levelIndex >= ALL_LEVELS.length - 1) {
      setLevelPickerOpen(true);
      return;
    }
    selectLevel(levelIndex + 1);
  }, [levelIndex, selectLevel]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (event.key === "Escape") {
        setActiveColor(null);
        activePointerId.current = null;
        setLevelPickerOpen(false);
        if (rulesOpen) startTutorial();
        else if (tutorialActive) dismissTutorial();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    dismissTutorial,
    redo,
    rulesOpen,
    startTutorial,
    tutorialActive,
    undo
  ]);

  const chapterComplete = chapterLevels.every((item) =>
    solvedLevels.includes(item.id)
  );
  const chapterPosition =
    chapterLevels.findIndex((item) => item.id === level.id) + 1;
  const isChapterEnd = chapterPosition === chapterLevels.length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <CatMascot />
          </span>
          <div>
            <p>猫咪连线</p>
            <h1>{currentChapter.title}</h1>
          </div>
        </div>

        <div className="topbar-actions">
          {debugMode && <span className="debug-badge">DEBUG</span>}
          <button
            className={`icon-button tutorial-button ${
              tutorialActive ? "is-active" : ""
            }`}
            type="button"
            title="查看规则"
            aria-label="查看规则"
            aria-pressed={rulesOpen || tutorialActive}
            onClick={openRules}
          >
            <BookOpenCheck size={20} strokeWidth={1.8} />
          </button>
          <button
            className="icon-button level-button"
            type="button"
            title="选择关卡"
            aria-label="选择关卡"
            onClick={() => {
              setPickerChapter(level.chapter);
              setLevelPickerOpen(true);
            }}
          >
            <Grid3X3 size={20} strokeWidth={1.8} />
            <span>{String(level.id).padStart(2, "0")}</span>
          </button>
        </div>
      </header>

      <section className="game-layout">
        <aside className="level-meta" aria-label="关卡信息">
          <p className="eyebrow">
            第{CHAPTER_LABELS[level.chapter]}章 · {level.difficulty}
          </p>
          <div className="level-heading">
            <button
              className="icon-button"
              type="button"
              title="上一关"
              aria-label="上一关"
              disabled={
                levelIndex === 0 ||
                (!debugMode &&
                  !isLevelUnlocked(ALL_LEVELS[levelIndex - 1], unlocked))
              }
              onClick={() => selectLevel(levelIndex - 1)}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <strong>{level.title}</strong>
              <span>
                {level.rows} × {level.cols}
              </span>
            </div>
            <button
              className="icon-button"
              type="button"
              title="下一关"
              aria-label="下一关"
              disabled={
                levelIndex >= ALL_LEVELS.length - 1 ||
                (!debugMode &&
                  !isLevelUnlocked(ALL_LEVELS[levelIndex + 1], unlocked))
              }
              onClick={() => selectLevel(levelIndex + 1)}
            >
              <ArrowRight size={20} />
            </button>
          </div>

          <div
            className="chapter-progress"
            aria-label="章节进度"
            style={{
              gridTemplateColumns: `repeat(${chapterLevels.length}, minmax(0, 1fr))`
            }}
          >
            {chapterLevels.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${item.id === level.id ? "is-current" : ""} ${
                  solvedLevels.includes(item.id) ? "is-solved" : ""
                }`}
                disabled={!debugMode && !isLevelUnlocked(item, unlocked)}
                aria-label={`第 ${item.id} 关`}
                onClick={() => selectLevel(item.id - 1)}
              >
                <span />
              </button>
            ))}
          </div>

          {tutorialActive && (
            <InteractiveTutorial
              key={`${level.id}:${tutorialRun}`}
              chapterLabel={`第${CHAPTER_LABELS[level.chapter]}章 ${currentChapter.title}`}
              levelId={level.id}
              mode={level.mode}
              progress={tutorialProgress}
              onDismiss={dismissTutorial}
            />
          )}
        </aside>

        {isSlitherlinkLevel(level) || isMejilinkLevel(level) ? (
          <SlitherlinkGame
            key={`${level.id}:${gameInstance}`}
            level={level}
            initialMarks={
              forceFreshState ? {} : loadProgress().edges?.[level.id] ?? {}
            }
            chapterComplete={chapterComplete}
            chapterPosition={chapterPosition}
            chapterLength={chapterLevels.length}
            isChapterEnd={isChapterEnd}
            isLastLevel={level.id === ALL_LEVELS.length}
            onChange={persistEdgePuzzle}
            onNext={goNext}
            onOpenLevels={() => {
              setPickerChapter(level.chapter);
              setLevelPickerOpen(true);
            }}
          />
        ) : isCellLoopLevel(level) ? (
          <CellLoopGame
            key={`${level.id}:${gameInstance}`}
            level={level}
            initialMarks={
              forceFreshState ? {} : loadProgress().edges?.[level.id] ?? {}
            }
            chapterComplete={chapterComplete}
            chapterPosition={chapterPosition}
            chapterLength={chapterLevels.length}
            isChapterEnd={isChapterEnd}
            isLastLevel={level.id === ALL_LEVELS.length}
            onChange={persistEdgePuzzle}
            onNext={goNext}
            onOpenLevels={() => {
              setPickerChapter(level.chapter);
              setLevelPickerOpen(true);
            }}
          />
        ) : isThermometerLevel(level) ? (
          <ThermometerGame
            key={`${level.id}:${gameInstance}`}
            level={level}
            initialState={
              forceFreshState
                ? {}
                : loadProgress().thermometers?.[level.id] ?? {}
            }
            chapterComplete={chapterComplete}
            chapterPosition={chapterPosition}
            chapterLength={chapterLevels.length}
            isChapterEnd={isChapterEnd}
            isLastLevel={level.id === ALL_LEVELS.length}
            onChange={persistThermometer}
            onNext={goNext}
            onOpenLevels={() => {
              setPickerChapter(level.chapter);
              setLevelPickerOpen(true);
            }}
          />
        ) : isHashiLevel(level) ? (
          <HashiGame
            key={`${level.id}:${gameInstance}`}
            level={level}
            initialBridges={
              forceFreshState ? {} : loadProgress().bridges?.[level.id] ?? {}
            }
            chapterComplete={chapterComplete}
            chapterPosition={chapterPosition}
            chapterLength={chapterLevels.length}
            isChapterEnd={isChapterEnd}
            isLastLevel={level.id === ALL_LEVELS.length}
            onChange={persistHashi}
            onNext={goNext}
            onOpenLevels={() => {
              setPickerChapter(level.chapter);
              setLevelPickerOpen(true);
            }}
          />
        ) : (
          <>
          <section className="play-area">
          <div className="board-status">
            <div>
              <span>连接</span>
              <strong>
                {connectedCount}/{level.colors.length}
              </strong>
            </div>
            <div className="status-center">
              <div className="coverage-track" aria-label={`已铺满 ${filledCount} 格`}>
                <span style={{ width: `${(filledCount / totalCells) * 100}%` }} />
              </div>
              {level.mode === "number-end" && (
                <small className={feedback ? "is-warning" : ""} aria-live="polite">
                  {feedback || "数字表示路径占格数"}
                </small>
              )}
            </div>
            <div>
              <span>铺满</span>
              <strong>
                {filledCount}/{totalCells}
              </strong>
            </div>
          </div>

          <div className="board-stage">
            <NumberlinkBoard
              key={`${level.id}:${gameInstance}`}
              level={level}
              paths={paths}
              activeColor={activeColor}
              invalidCell={invalidCell}
              solved={won}
              onPointerDown={startPath}
              onPointerMove={extendPath}
              onPointerUp={stopPath}
            />

            {won && (
              <WinOverlay
                key={level.id}
                chapterComplete={chapterComplete}
                chapterPosition={chapterPosition}
                chapterLength={chapterLevels.length}
                levelId={level.id}
                isChapterEnd={isChapterEnd}
                isLastLevel={level.id === ALL_LEVELS.length}
                onNext={goNext}
                onOpenLevels={() => {
                  setPickerChapter(level.chapter);
                  setLevelPickerOpen(true);
                }}
              />
            )}
          </div>
        </section>

        <aside className="tool-rail" aria-label="棋盘工具">
          <button
            className="icon-button"
            type="button"
            title="撤销"
            aria-label="撤销"
            disabled={undoStack.length === 0}
            onClick={undo}
          >
            <Undo2 size={21} />
          </button>
          <button
            className="icon-button"
            type="button"
            title="重做"
            aria-label="重做"
            disabled={redoStack.length === 0}
            onClick={redo}
          >
            <Redo2 size={21} />
          </button>
          <span className="tool-divider" />
          <button
            className="icon-button"
            type="button"
            title="提示"
            aria-label="提示"
            onClick={hint}
          >
            <Lightbulb size={21} />
          </button>
          <button
            className="icon-button"
            type="button"
            title="重置"
            aria-label="重置"
            disabled={filledCount === 0}
            onClick={reset}
          >
            <RotateCcw size={20} />
          </button>
          </aside>
          </>
        )}
      </section>

      {rulesOpen && (
        <RulesModal
          chapterLabel={`第${CHAPTER_LABELS[level.chapter]}章`}
          mode={level.mode}
          onStart={startTutorial}
        />
      )}

      {levelPickerOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onPointerDown={(event) => {
            if (event.currentTarget === event.target) setLevelPickerOpen(false);
          }}
        >
          <section
            className="level-picker"
            role="dialog"
            aria-modal="true"
            aria-labelledby="level-picker-title"
          >
            <header>
              <div>
                <p>猫咪连线</p>
                <h2 id="level-picker-title">选择关卡</h2>
              </div>
              <button
                className="icon-button"
                type="button"
                title="关闭"
                aria-label="关闭"
                onClick={() => setLevelPickerOpen(false)}
              >
                <X size={21} />
              </button>
            </header>

            <div className="chapter-tabs" role="tablist" aria-label="章节">
              {CHAPTERS.map((chapter) => (
                <button
                  key={chapter.id}
                  type="button"
                  role="tab"
                  aria-selected={pickerChapter === chapter.id}
                  className={pickerChapter === chapter.id ? "is-active" : ""}
                  onClick={() => setPickerChapter(chapter.id)}
                >
                  <span>第{CHAPTER_LABELS[chapter.id]}章</span>
                  <strong>{chapter.title}</strong>
                </button>
              ))}
            </div>

            <div className="level-chapter-heading">
              <h3>{selectedChapter.title}</h3>
              <span>
                {selectedChapter.levels.filter((item) =>
                  solvedLevels.includes(item.id)
                ).length}
                /{selectedChapter.levels.length}
              </span>
            </div>
            <div className="level-grid">
              {selectedChapter.levels.map((item) => {
                const isLocked =
                  !debugMode && !isLevelUnlocked(item, unlocked);
                const isSolved = solvedLevels.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${item.id === level.id ? "is-current" : ""} ${
                      isSolved ? "is-solved" : ""
                    }`}
                    disabled={isLocked}
                    onClick={() => selectLevel(item.id - 1)}
                  >
                    <span>{String(item.id).padStart(2, "0")}</span>
                    <strong>{item.title}</strong>
                    <small>{isLocked ? "未解锁" : item.difficulty}</small>
                    {isSolved && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
