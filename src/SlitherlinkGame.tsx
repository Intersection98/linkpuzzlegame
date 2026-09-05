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
  findSlitherlinkConflict,
  countLinesAroundCell,
  getSlitherlinkEdges,
  getSlitherlinkClueState,
  slitherlinkProgress,
  validateSlitherlink,
  type EdgeKey,
  type EdgeMap,
  type EdgeMark,
  type SlitherlinkLevel
} from "./slitherlink";
import {
  findMejilinkConflict,
  getMejilinkEdges,
  getMejilinkRegionState,
  mejilinkProgress,
  validateMejilink,
  type MejilinkLevel
} from "./mejilink";
import WinOverlay from "./WinOverlay";
import { useCompletionSound } from "./useCompletionSound";

type SlitherlinkGameProps = {
  level: SlitherlinkLevel | MejilinkLevel;
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

function cloneMarks(marks: EdgeMap): EdgeMap {
  return { ...marks };
}

export default function SlitherlinkGame({
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
}: SlitherlinkGameProps) {
  const [marks, setMarks] = useState<EdgeMap>(() => cloneMarks(initialMarks));
  const [drawMode, setDrawMode] = useState<EdgeMark>("line");
  const [undoStack, setUndoStack] = useState<EdgeMap[]>([]);
  const [redoStack, setRedoStack] = useState<EdgeMap[]>([]);
  const [feedback, setFeedback] = useState("");
  const [isDrawing, setIsDrawing] = useState(false);
  const feedbackTimer = useRef<number | undefined>(undefined);
  const activePointerId = useRef<number | null>(null);
  const dragMark = useRef<EdgeMark | null>(null);
  const touchedEdges = useRef(new Set<EdgeKey>());
  const edges = useMemo(
    () =>
      level.mode === "mejilink"
        ? getMejilinkEdges(level)
        : getSlitherlinkEdges(level.rows, level.cols),
    [level]
  );
  const isMejilink = level.mode === "mejilink";
  const progress = useMemo(
    () => {
      if (level.mode === "mejilink") {
        const result = mejilinkProgress(level, marks);
        return {
          lineCount: result.lineCount,
          satisfiedClues: result.matchedRegions,
          clueCount: result.regionCount
        };
      }
      return slitherlinkProgress(level, marks);
    },
    [level, marks]
  );
  const solved = useMemo(
    () =>
      level.mode === "mejilink"
        ? validateMejilink(level, marks).complete
        : validateSlitherlink(level, marks).complete,
    [level, marks]
  );
  useCompletionSound(level.id, solved);
  const conflictFor = useCallback(
    (next: EdgeMap) =>
      level.mode === "mejilink"
        ? findMejilinkConflict(level, next)
        : findSlitherlinkConflict(level, next),
    [level]
  );
  const regionBoundaries = useMemo(
    () =>
      level.mode === "mejilink"
        ? new Set(level.playableEdges)
        : new Set<EdgeKey>(),
    [level]
  );
  const regionStates = useMemo(
    () =>
      level.mode === "mejilink"
        ? new Map(
            level.regions.map((region) => [
              region.id,
              getMejilinkRegionState(region, marks).state
            ])
          )
        : new Map<string, "pending" | "matched" | "exceeded">(),
    [level, marks]
  );
  const visibleVertices = useMemo(() => {
    if (!isMejilink) return null;
    return new Set(
      edges.flatMap((edge) =>
        edge.vertices.map(([row, col]) => `${row}:${col}`)
      )
    );
  }, [edges, isMejilink]);

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
    (edge: EdgeKey, mark: EdgeMark | null) => {
      setMarks((current) => {
        const next = cloneMarks(current);
        if (mark === null) delete next[edge];
        else next[edge] = mark;

        if (mark !== null) {
          const conflict = conflictFor(next);
          if (conflict) {
            showFeedback(conflict);
            return current;
          }
        }

        setFeedback("");
        return next;
      });
    },
    [conflictFor, showFeedback]
  );

  const edgeFromEvent = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>): EdgeKey | null => {
      const rect = event.currentTarget.getBoundingClientRect();
      const rawX =
        ((event.clientX - rect.left) / rect.width) * (level.cols + 0.32) - 0.16;
      const rawY =
        ((event.clientY - rect.top) / rect.height) * (level.rows + 0.32) - 0.16;
      if (
        rawX < -0.16 ||
        rawY < -0.16 ||
        rawX > level.cols + 0.16 ||
        rawY > level.rows + 0.16
      ) {
        return null;
      }
      const x = Math.max(0, Math.min(level.cols, rawX));
      const y = Math.max(0, Math.min(level.rows, rawY));

      const horizontalRow = Math.max(0, Math.min(level.rows, Math.round(y)));
      const horizontalCol = Math.max(
        0,
        Math.min(level.cols - 1, Math.floor(x))
      );
      const verticalRow = Math.max(
        0,
        Math.min(level.rows - 1, Math.floor(y))
      );
      const verticalCol = Math.max(0, Math.min(level.cols, Math.round(x)));

      const horizontalDistance = Math.abs(y - horizontalRow);
      const verticalDistance = Math.abs(x - verticalCol);
      if (Math.min(horizontalDistance, verticalDistance) > 0.28) return null;

      const edge: EdgeKey = horizontalDistance <= verticalDistance
        ? `h:${horizontalRow}:${horizontalCol}`
        : `v:${verticalRow}:${verticalCol}`;
      return isMejilink && !regionBoundaries.has(edge) ? null : edge;
    },
    [isMejilink, level.cols, level.rows, regionBoundaries]
  );

  const startDrawing = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (solved) return;
      const edge = edgeFromEvent(event);
      if (!edge) return;
      const requestedMode = event.button === 2 ? "cross" : drawMode;
      const nextMark = marks[edge] === requestedMode ? null : requestedMode;
      const preview = cloneMarks(marks);
      if (nextMark === null) delete preview[edge];
      else preview[edge] = nextMark;
      if (nextMark !== null) {
        const conflict = conflictFor(preview);
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
      setUndoStack((stack) => [...stack, cloneMarks(marks)]);
      setRedoStack([]);
      setIsDrawing(true);
      navigator.vibrate?.(6);
      applyMark(edge, nextMark);
    },
    [applyMark, conflictFor, drawMode, edgeFromEvent, marks, showFeedback, solved]
  );

  const continueDrawing = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.pointerId !== activePointerId.current) return;
      const edge = edgeFromEvent(event);
      if (!edge || touchedEdges.current.has(edge)) return;
      touchedEdges.current.add(edge);
      applyMark(edge, dragMark.current);
    },
    [applyMark, edgeFromEvent]
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
    setRedoStack((stack) => [...stack, cloneMarks(marks)]);
    setMarks(cloneMarks(previous));
    setUndoStack((stack) => stack.slice(0, -1));
    setFeedback("");
  }, [marks, undoStack]);

  const redo = useCallback(() => {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((stack) => [...stack, cloneMarks(marks)]);
    setMarks(cloneMarks(next));
    setRedoStack((stack) => stack.slice(0, -1));
    setFeedback("");
  }, [marks, redoStack]);

  const hint = useCallback(() => {
    const solution = new Set(level.solutionEdges);
    const wrongLine = Object.entries(marks).find(
      ([edge, mark]) => mark === "line" && !solution.has(edge as EdgeKey)
    );
    const next = cloneMarks(marks);

    if (wrongLine) {
      next[wrongLine[0]] = "cross";
    } else {
      const missing = level.solutionEdges.find((edge) => marks[edge] !== "line");
      if (!missing) return;
      next[missing] = "line";
    }

    setUndoStack((stack) => [...stack, cloneMarks(marks)]);
    setRedoStack([]);
    setMarks(next);
    setFeedback("");
  }, [level.solutionEdges, marks]);

  const reset = useCallback(() => {
    if (Object.keys(marks).length === 0) return;
    setUndoStack((stack) => [...stack, cloneMarks(marks)]);
    setRedoStack([]);
    setMarks({});
    setFeedback("");
  }, [marks]);

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

  return (
    <>
      <section className="play-area">
        <div className="board-status">
          <div>
            <span>线段</span>
            <strong>{progress.lineCount}</strong>
          </div>
          <div className="status-center">
            <div
              className="coverage-track"
              aria-label={`已满足 ${progress.satisfiedClues} 个${
                isMejilink ? "区域" : "提示"
              }`}
            >
              <span
                style={{
                  width: `${(progress.satisfiedClues / progress.clueCount) * 100}%`
                }}
              />
            </div>
            <small className={feedback ? "is-warning" : ""} aria-live="polite">
              {feedback || (drawMode === "line" ? "画线模式" : "排除模式")}
            </small>
          </div>
          <div>
            <span>{isMejilink ? "区域" : "提示"}</span>
            <strong>
              {progress.satisfiedClues}/{progress.clueCount}
            </strong>
          </div>
        </div>

        <div className="board-stage">
          <div
            className={`board-shell slitherlink-shell ${
              isMejilink ? "mejilink-shell" : ""
            } ${isDrawing ? "is-interacting" : ""} ${
              solved ? "is-solved" : ""
            }`}
            style={{ aspectRatio: `${level.cols} / ${level.rows}` }}
          >
            <svg
              className="slitherlink-board"
              viewBox={`-0.16 -0.16 ${level.cols + 0.32} ${level.rows + 0.32}`}
              role="application"
              aria-label={`第 ${level.id} 关 ${level.chapterTitle}棋盘`}
              onPointerDown={startDrawing}
              onPointerMove={continueDrawing}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              onContextMenu={(event) => event.preventDefault()}
            >
              <rect
                className="slitherlink-background"
                x="-.16"
                y="-.16"
                width={level.cols + 0.32}
                height={level.rows + 0.32}
              />

              {level.mode === "mejilink" &&
                level.regionGrid.flatMap((row, rowIndex) =>
                  row.map((regionId, colIndex) => (
                    <rect
                      className={`mejilink-region region-${
                        Number.parseInt(regionId, 36) % 5
                      } is-${regionStates.get(regionId) ?? "open"}`}
                      key={`${rowIndex}:${colIndex}`}
                      x={colIndex}
                      y={rowIndex}
                      width="1"
                      height="1"
                    />
                  ))
                )}

              {edges.map((edge) => {
                const mark = marks[edge.key];
                const x1 = edge.col;
                const y1 = edge.row;
                const x2 = edge.orientation === "h" ? edge.col + 1 : edge.col;
                const y2 = edge.orientation === "v" ? edge.row + 1 : edge.row;
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                return (
                  <g key={edge.key}>
                    <line
                      className={`slither-grid-edge ${
                        regionBoundaries.has(edge.key) ? "is-region-boundary" : ""
                      }`}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                    />
                    {mark === "line" && (
                      <line
                        className="slither-line"
                        x1={x1}
                        y1={y1}
                        x2={x2}
                        y2={y2}
                      />
                    )}
                    {mark === "cross" && (
                      <g className="slither-cross">
                        <line
                          x1={midX - 0.1}
                          y1={midY - 0.1}
                          x2={midX + 0.1}
                          y2={midY + 0.1}
                        />
                        <line
                          x1={midX + 0.1}
                          y1={midY - 0.1}
                          x2={midX - 0.1}
                          y2={midY + 0.1}
                        />
                      </g>
                    )}
                  </g>
                );
              })}

              {level.mode === "slitherlink" &&
                level.clues.map((row, rowIndex) =>
                  row.map((clue, colIndex) =>
                    clue === null
                      ? null
                      : (() => {
                          const clueState = getSlitherlinkClueState(
                            clue,
                            countLinesAroundCell(marks, rowIndex, colIndex)
                          );
                          return (
                            <text
                              className={`slither-clue clue-${clue} is-${clueState}`}
                              key={`${rowIndex}:${colIndex}`}
                              x={colIndex + 0.5}
                              y={rowIndex + 0.5}
                            >
                              {clue}
                            </text>
                          );
                        })()
                  )
                )}

              {Array.from(
                { length: (level.rows + 1) * (level.cols + 1) },
                (_, index) => {
                  const row = Math.floor(index / (level.cols + 1));
                  const col = index % (level.cols + 1);
                  if (
                    visibleVertices &&
                    !visibleVertices.has(`${row}:${col}`)
                  ) {
                    return null;
                  }
                  return (
                    <circle
                      className="slither-dot"
                      key={`${row}:${col}`}
                      cx={col}
                      cy={row}
                      r=".065"
                    />
                  );
                }
              )}
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

      <aside
        className="tool-rail slither-tools"
        aria-label={`${level.chapterTitle}工具`}
      >
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
          disabled={Object.keys(marks).length === 0}
          onClick={reset}
        >
          <RotateCcw size={20} />
        </button>
      </aside>
    </>
  );
}
