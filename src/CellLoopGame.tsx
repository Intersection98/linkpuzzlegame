import {
  Lightbulb,
  Minus,
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
  cellKey,
  cellLoopProgress,
  findCellLoopConflict,
  getCellLoopClueState,
  getCellLoopEdges,
  getPipeCellDirections,
  pipeClueEdges,
  type CellEdgeKey,
  type CellLoopClue,
  type CellLoopLevel,
  type PipeDirection
} from "./cellLoop";
import { validateCellLoop } from "./cellLoop";
import type { EdgeMap, EdgeMark } from "./slitherlink";
import WinOverlay from "./WinOverlay";
import { useCompletionSound } from "./useCompletionSound";

type CellLoopGameProps = {
  level: CellLoopLevel;
  initialMarks: EdgeMap;
  chapterComplete: boolean;
  chapterPosition: number;
  chapterLength: number;
  isChapterEnd: boolean;
  isLastLevel: boolean;
  onChange: (marks: EdgeMap, complete: boolean) => void;
  onNext: () => void;
  onOpenLevels: () => void;
};

function initialState(level: CellLoopLevel, saved: EdgeMap): EdgeMap {
  return {
    ...saved,
    ...Object.fromEntries(
      [...level.prefilledEdges, ...pipeClueEdges(level)].map((edge) => [
        edge,
        "line"
      ])
    )
  };
}

function edgeMidpoint(edge: CellEdgeKey): PointLike {
  const [orientation, rowValue, colValue] = edge.split(":");
  const row = Number(rowValue);
  const col = Number(colValue);
  return orientation === "ch"
    ? { x: col + 1, y: row + 0.5 }
    : { x: col + 0.5, y: row + 1 };
}

type PointLike = { x: number; y: number };

function pipeDirectionPoint(
  row: number,
  col: number,
  direction: PipeDirection
): PointLike {
  if (direction === "up") return { x: col + 0.5, y: row };
  if (direction === "right") return { x: col + 1, y: row + 0.5 };
  if (direction === "down") return { x: col + 0.5, y: row + 1 };
  return { x: col, y: row + 0.5 };
}

function clueClass(
  level: CellLoopLevel,
  clue: CellLoopClue,
  marks: EdgeMap
): string {
  return `loop-clue ${clue.kind} is-${getCellLoopClueState(level, clue, marks)}`;
}

function LoopCatClue({ label }: { label?: number }) {
  return (
    <g className="loop-cat-clue">
      <path
        className="loop-cat-head"
        d="M-.26-.06-.28-.28q0-.06.05-.03l.13.1q.1-.05.2 0l.13-.1q.05-.03.05.03l-.02.22q.08.08.05.2Q.25.29 0 .3q-.25-.01-.29-.16-.03-.12.05-.2Z"
      />
      <path className="loop-cat-ear" d="m-.23-.25.03.13.09-.08Zm.46 0-.03.13-.09-.08Z" />
      {label !== undefined && (
        <text
          className="loop-cat-number"
          y="-.12"
          fontSize={label > 9 ? 0.16 : 0.2}
        >
          {label}
        </text>
      )}
      <circle className="loop-cat-eye" cx="-.1" cy=".035" r=".027" />
      <circle className="loop-cat-eye" cx=".1" cy=".035" r=".027" />
      <path className="loop-cat-nose" d="M0 .105-.035.08h.07Z" />
      <path
        className="loop-cat-mouth"
        d="M0 .105v.035m0 0q-.045.05-.08.005m.08-.005q.045.05.08.005"
      />
      <path
        className="loop-cat-whisker"
        d="M-.14.115-.29.08M-.14.17-.3.19M.14.115.29.08M.14.17.3.19"
      />
    </g>
  );
}

export default function CellLoopGame({
  level,
  initialMarks,
  chapterComplete,
  chapterPosition,
  chapterLength,
  isChapterEnd,
  isLastLevel,
  onChange,
  onNext,
  onOpenLevels
}: CellLoopGameProps) {
  const [marks, setMarks] = useState<EdgeMap>(() =>
    initialState(level, initialMarks)
  );
  const [drawMode, setDrawMode] = useState<EdgeMark>("line");
  const [undoStack, setUndoStack] = useState<EdgeMap[]>([]);
  const [redoStack, setRedoStack] = useState<EdgeMap[]>([]);
  const [feedback, setFeedback] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const feedbackTimer = useRef<number | undefined>(undefined);
  const activePointerId = useRef<number | null>(null);
  const dragMark = useRef<EdgeMark | null>(null);
  const touchedEdges = useRef(new Set<CellEdgeKey>());
  const blocked = useMemo(
    () => new Set(level.blockedCells.map(cellKey)),
    [level.blockedCells]
  );
  const prefilled = useMemo(
    () => new Set([...level.prefilledEdges, ...pipeClueEdges(level)]),
    [level]
  );
  const pipeClueCells = useMemo(
    () => new Set((level.pipeClues ?? []).map(cellKey)),
    [level.pipeClues]
  );
  const edges = useMemo(
    () => getCellLoopEdges(level.rows, level.cols, level.blockedCells),
    [level.blockedCells, level.cols, level.rows]
  );
  const progress = useMemo(
    () => cellLoopProgress(level, marks),
    [level, marks]
  );
  const solved = useMemo(
    () => validateCellLoop(level, marks).complete,
    [level, marks]
  );
  useCompletionSound(level.id, solved);

  useEffect(() => {
    onChange(marks, solved);
  }, [marks, onChange, solved]);

  useEffect(
    () => () => {
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    },
    []
  );

  const showFeedback = useCallback((message: string) => {
    if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    setFeedback(message);
    navigator.vibrate?.([14, 24, 14]);
    feedbackTimer.current = window.setTimeout(() => setFeedback(""), 1400);
  }, []);

  const applyMark = useCallback(
    (edge: CellEdgeKey, mark: EdgeMark | null) => {
      if (prefilled.has(edge)) return;
      setMarks((current) => {
        const next = { ...current };
        if (mark === null) delete next[edge];
        else next[edge] = mark;
        if (mark !== null) {
          const conflict = findCellLoopConflict(level, next);
          if (conflict) {
            showFeedback(conflict);
            return current;
          }
        }
        setFeedback("");
        return next;
      });
    },
    [level, prefilled, showFeedback]
  );

  const edgeFromEvent = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>): CellEdgeKey | null => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * level.cols;
      const y = ((event.clientY - rect.top) / rect.height) * level.rows;
      if (x < 0 || y < 0 || x > level.cols || y > level.rows) return null;

      let closest: { key: CellEdgeKey; distance: number } | null = null;
      for (const edge of edges) {
        const x1 = edge.start.col + 0.5;
        const y1 = edge.start.row + 0.5;
        const x2 = edge.end.col + 0.5;
        const y2 = edge.end.row + 0.5;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        const t = Math.max(
          0,
          Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared)
        );
        const distance = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
        if (!closest || distance < closest.distance) {
          closest = { key: edge.key, distance };
        }
      }

      return closest && closest.distance <= 0.28 ? closest.key : null;
    },
    [edges, level.cols, level.rows]
  );

  const startDrawing = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (solved) return;
      const edge = edgeFromEvent(event);
      if (!edge || prefilled.has(edge)) return;
      const requestedMode = event.button === 2 ? "cross" : drawMode;
      const nextMark = marks[edge] === requestedMode ? null : requestedMode;
      const preview = { ...marks };
      if (nextMark === null) delete preview[edge];
      else preview[edge] = nextMark;
      if (nextMark !== null) {
        const conflict = findCellLoopConflict(level, preview);
        if (conflict) {
          showFeedback(conflict);
          return;
        }
      }

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      activePointerId.current = event.pointerId;
      dragMark.current = nextMark;
      touchedEdges.current = new Set([edge]);
      setUndoStack((stack) => [...stack, { ...marks }]);
      setRedoStack([]);
      setIsDrawing(true);
      navigator.vibrate?.(6);
      applyMark(edge, nextMark);
    },
    [applyMark, drawMode, edgeFromEvent, level, marks, prefilled, showFeedback, solved]
  );

  const continueDrawing = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.pointerId !== activePointerId.current) return;
      const edge = edgeFromEvent(event);
      if (!edge || touchedEdges.current.has(edge) || prefilled.has(edge)) return;
      touchedEdges.current.add(edge);
      applyMark(edge, dragMark.current);
    },
    [applyMark, edgeFromEvent, prefilled]
  );

  const stopDrawing = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.pointerId !== activePointerId.current) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      activePointerId.current = null;
      touchedEdges.current.clear();
      setIsDrawing(false);
    },
    []
  );

  const undo = useCallback(() => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack((stack) => [...stack, { ...marks }]);
    setMarks(initialState(level, previous));
    setUndoStack((stack) => stack.slice(0, -1));
    setFeedback("");
  }, [level, marks, undoStack]);

  const redo = useCallback(() => {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((stack) => [...stack, { ...marks }]);
    setMarks(initialState(level, next));
    setRedoStack((stack) => stack.slice(0, -1));
    setFeedback("");
  }, [level, marks, redoStack]);

  const hint = useCallback(() => {
    const solution = new Set(level.solutionEdges);
    const wrongLine = Object.entries(marks).find(
      ([edge, mark]) =>
        mark === "line" &&
        !prefilled.has(edge as CellEdgeKey) &&
        !solution.has(edge as CellEdgeKey)
    );
    const next = { ...marks };
    if (wrongLine) {
      next[wrongLine[0]] = "cross";
    } else {
      const missing = level.solutionEdges.find((edge) => marks[edge] !== "line");
      if (!missing) return;
      next[missing] = "line";
    }
    setUndoStack((stack) => [...stack, { ...marks }]);
    setRedoStack([]);
    setMarks(next);
    setFeedback("");
  }, [level.solutionEdges, marks, prefilled]);

  const reset = useCallback(() => {
    const base = initialState(level, {});
    if (JSON.stringify(marks) === JSON.stringify(base)) return;
    setUndoStack((stack) => [...stack, { ...marks }]);
    setRedoStack([]);
    setMarks(base);
    setFeedback("");
  }, [level, marks]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") {
        return;
      }
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [redo, undo]);

  const progressValue =
    level.mode === "pipelink"
      ? progress.visitedCells / progress.availableCells
      : progress.clueCount === 0
        ? 0
        : progress.matchedClues / progress.clueCount;

  return (
    <>
      <section className="play-area">
        <div className="board-status">
          <div>
            <span>线段</span>
            <strong>{progress.lineCount}</strong>
          </div>
          <div className="status-center">
            <div className="coverage-track">
              <span style={{ width: `${progressValue * 100}%` }} />
            </div>
            <small className={feedback ? "is-warning" : ""} aria-live="polite">
              {feedback || (drawMode === "line" ? "画线模式" : "排除模式")}
            </small>
          </div>
          <div>
            <span>{level.mode === "pipelink" ? "覆盖" : "提示"}</span>
            <strong>
              {level.mode === "pipelink"
                ? `${progress.visitedCells}/${progress.availableCells}`
                : `${progress.matchedClues}/${progress.clueCount}`}
            </strong>
          </div>
        </div>

        <div className="board-stage">
          <div
            className={`board-shell cell-loop-shell ${
              isDrawing ? "is-interacting" : ""
            } ${solved ? "is-solved" : ""}`}
            style={{ aspectRatio: `${level.cols} / ${level.rows}` }}
          >
            <svg
              className="cell-loop-board"
              viewBox={`0 0 ${level.cols} ${level.rows}`}
              role="application"
              aria-label={`第 ${level.id} 关 ${level.chapterTitle}棋盘`}
              onPointerDown={startDrawing}
              onPointerMove={continueDrawing}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              onContextMenu={(event) => event.preventDefault()}
            >
              <rect
                className="cell-loop-background"
                width={level.cols}
                height={level.rows}
              />

              {Array.from({ length: level.rows * level.cols }, (_, index) => {
                const row = Math.floor(index / level.cols);
                const col = index % level.cols;
                return (
                  <rect
                    key={`${row}:${col}`}
                    className={
                      blocked.has(`${row}:${col}`)
                        ? "blocked-cell"
                        : `loop-cell ${
                            pipeClueCells.has(`${row}:${col}`)
                              ? "has-pipe-clue"
                              : ""
                          }`
                    }
                    x={col + 0.04}
                    y={row + 0.04}
                    width=".92"
                    height=".92"
                    rx=".08"
                  />
                );
              })}

              {edges.map((edge) => (
                <line
                  className="cell-loop-guide"
                  key={`guide:${edge.key}`}
                  x1={edge.start.col + 0.5}
                  y1={edge.start.row + 0.5}
                  x2={edge.end.col + 0.5}
                  y2={edge.end.row + 0.5}
                />
              ))}

              {edges.map((edge) => {
                const mark = marks[edge.key];
                const x1 = edge.start.col + 0.5;
                const y1 = edge.start.row + 0.5;
                const x2 = edge.end.col + 0.5;
                const y2 = edge.end.row + 0.5;
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                return (
                  <g key={edge.key}>
                    {mark === "line" && (
                      <line
                        className={`cell-loop-line ${
                          level.mode !== "pipelink" &&
                          prefilled.has(edge.key)
                            ? "is-prefilled"
                            : ""
                        }`}
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                      />
                    )}
                    {mark === "cross" && (
                      <g className="cell-loop-cross">
                        <line
                          x1={midX - 0.09}
                          y1={midY - 0.09}
                          x2={midX + 0.09}
                          y2={midY + 0.09}
                        />
                        <line
                          x1={midX + 0.09}
                          y1={midY - 0.09}
                          x2={midX - 0.09}
                          y2={midY + 0.09}
                        />
                      </g>
                    )}
                  </g>
                );
              })}

              {level.mode === "pipelink" &&
                (level.pipeClues ?? []).map((clue) => {
                  const center = {
                    x: clue.col + 0.5,
                    y: clue.row + 0.5
                  };
                  if (clue.directions.length === 4) {
                    const up = pipeDirectionPoint(
                      clue.row,
                      clue.col,
                      "up"
                    );
                    const right = pipeDirectionPoint(
                      clue.row,
                      clue.col,
                      "right"
                    );
                    const down = pipeDirectionPoint(
                      clue.row,
                      clue.col,
                      "down"
                    );
                    const left = pipeDirectionPoint(
                      clue.row,
                      clue.col,
                      "left"
                    );
                    return (
                      <g
                        className="pipe-clue-shape"
                        key={`pipe:${cellKey(clue)}`}
                      >
                        <line
                          className="pipe-clue-segment"
                          x1={left.x}
                          y1={left.y}
                          x2={right.x}
                          y2={right.y}
                        />
                        <line
                          className="pipe-clue-segment"
                          x1={up.x}
                          y1={up.y}
                          x2={down.x}
                          y2={down.y}
                        />
                      </g>
                    );
                  }
                  const points = clue.directions.map((direction) =>
                    pipeDirectionPoint(clue.row, clue.col, direction)
                  );
                  return (
                    <polyline
                      className="pipe-clue-segment"
                      key={`pipe:${cellKey(clue)}`}
                      points={`${points[0].x},${points[0].y} ${center.x},${center.y} ${points[1].x},${points[1].y}`}
                    />
                  );
                })}

              {level.mode === "pipelink" &&
                Array.from(
                  { length: level.rows * level.cols },
                  (_, index) => ({
                    row: Math.floor(index / level.cols),
                    col: index % level.cols
                  })
                ).map((point) => {
                  if (
                    getPipeCellDirections(level, marks, point).length !== 4
                  ) {
                    return null;
                  }
                  const fixed = pipeClueCells.has(cellKey(point));
                  return (
                    <g
                      className={`pipe-crossing ${
                        fixed ? "is-prefilled" : ""
                      }`}
                      key={`cross:${cellKey(point)}`}
                    >
                      <line
                        className="pipe-crossing-gap"
                        x1={point.col + 0.5}
                        y1={point.row + 0.39}
                        x2={point.col + 0.5}
                        y2={point.row + 0.61}
                      />
                      <line
                        className="pipe-crossing-over"
                        x1={point.col + 0.5}
                        y1={point.row + 0.3}
                        x2={point.col + 0.5}
                        y2={point.row + 0.7}
                      />
                    </g>
                  );
                })}

              {level.loopClues.map((clue, index) => {
                const state = clueClass(level, clue, marks);
                const point = clue.edge
                  ? edgeMidpoint(clue.edge)
                  : { x: clue.col + 0.5, y: clue.row + 0.5 };
                const isPearl = ["white", "black", "gray"].includes(clue.kind);
                const hasDisc = isPearl || clue.kind === "length";
                const isCatClue =
                  (level.mode === "masyu" ||
                    level.mode === "balance-loop" ||
                    level.mode === "shingoki") &&
                  ["white", "black", "gray"].includes(clue.kind);
                return (
                  <g
                    className={state}
                    key={`${clue.kind}:${clue.row}:${clue.col}:${index}`}
                    transform={`translate(${point.x} ${point.y})`}
                  >
                    {isCatClue ? (
                      <LoopCatClue label={clue.value} />
                    ) : (
                      hasDisc && <circle className="loop-clue-disc" r=".25" />
                    )}
                    {(clue.kind === "mid-cell" || clue.kind === "mid-edge") && (
                      <circle className="midpoint-clue" r=".09" />
                    )}
                    {clue.value !== undefined && !isCatClue && (
                      <text className="loop-clue-number" y=".01">
                        {clue.value}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
            <div className="completion-sweep" aria-hidden="true" />
          </div>

          {solved && (
            <WinOverlay
              key={level.id}
              chapterComplete={chapterComplete}
              chapterPosition={chapterPosition}
              chapterLength={chapterLength}
              levelId={level.id}
              isChapterEnd={isChapterEnd}
              isLastLevel={isLastLevel}
              onNext={onNext}
              onOpenLevels={onOpenLevels}
            />
          )}
        </div>
      </section>

      <aside className="tool-rail loop-tools" aria-label={`${level.chapterTitle}工具`}>
        <button
          className={`icon-button ${drawMode === "line" ? "is-active" : ""}`}
          type="button"
          title="画线"
          aria-label="画线模式"
          aria-pressed={drawMode === "line"}
          onClick={() => setDrawMode("line")}
        >
          <Minus size={22} strokeWidth={3} />
        </button>
        <button
          className={`icon-button ${drawMode === "cross" ? "is-active" : ""}`}
          type="button"
          title="标记排除"
          aria-label="排除模式"
          aria-pressed={drawMode === "cross"}
          onClick={() => setDrawMode("cross")}
        >
          <X size={20} strokeWidth={2.5} />
        </button>
        <span className="tool-divider" />
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
          disabled={
            Object.keys(marks).length === level.prefilledEdges.length
          }
          onClick={reset}
        >
          <RotateCcw size={20} />
        </button>
      </aside>
    </>
  );
}
