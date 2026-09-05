import {
  Lightbulb,
  Redo2,
  RotateCcw,
  Undo2
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
  getCountState,
  thermometerCounts,
  validateThermometers,
  type ThermometerLevel,
  type ThermometerState
} from "./thermometers";
import WinOverlay from "./WinOverlay";
import { useCompletionSound } from "./useCompletionSound";

type ThermometerGameProps = {
  level: ThermometerLevel;
  initialState: ThermometerState;
  chapterComplete: boolean;
  chapterPosition: number;
  chapterLength: number;
  isChapterEnd: boolean;
  isLastLevel: boolean;
  onChange: (state: ThermometerState, complete: boolean) => void;
  onNext: () => void;
  onOpenLevels: () => void;
};

export default function ThermometerGame({
  level,
  initialState,
  chapterComplete,
  chapterPosition,
  chapterLength,
  isChapterEnd,
  isLastLevel,
  onChange,
  onNext,
  onOpenLevels
}: ThermometerGameProps) {
  const [state, setState] = useState<ThermometerState>({ ...initialState });
  const [undoStack, setUndoStack] = useState<ThermometerState[]>([]);
  const [redoStack, setRedoStack] = useState<ThermometerState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const activePointerId = useRef<number | null>(null);
  const activeThermometerId = useRef<string | null>(null);
  const dragMode = useRef<"fill" | "erase">("fill");
  const lastFill = useRef<number | null>(null);
  const counts = useMemo(
    () => thermometerCounts(level, state),
    [level, state]
  );
  const solved = useMemo(
    () => validateThermometers(level, state).complete,
    [level, state]
  );
  useCompletionSound(level.id, solved);
  const targetTotal = useMemo(
    () => level.rowTargets.reduce((sum, count) => sum + count, 0),
    [level.rowTargets]
  );

  useEffect(() => {
    onChange(state, solved);
  }, [onChange, solved, state]);

  const setFill = useCallback(
    (thermometerId: string, fill: number) => {
      if (solved) return;
      setUndoStack((stack) => [...stack, { ...state }]);
      setRedoStack([]);
      setState((current) => ({ ...current, [thermometerId]: fill }));
      navigator.vibrate?.(7);
    },
    [solved, state]
  );

  const cellFromEvent = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x =
        ((event.clientX - rect.left) / rect.width) * (level.cols + 1.2) - 0.6;
      const y =
        ((event.clientY - rect.top) / rect.height) * (level.rows + 1.2) - 0.6;
      const row = Math.floor(y);
      const col = Math.floor(x);
      const thermometer = level.thermometers.find((item) =>
        item.cells.some((cell) => cell.row === row && cell.col === col)
      );
      if (!thermometer) return null;
      const index = thermometer.cells.findIndex(
        (cell) => cell.row === row && cell.col === col
      );
      return { thermometer, index };
    },
    [level]
  );

  const startFill = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (solved) return;
      const hit = cellFromEvent(event);
      if (!hit) return;
      const { thermometer, index } = hit;
      const current = state[thermometer.id] ?? 0;
      const mode = current > index ? "erase" : "fill";
      const fill = mode === "erase" ? index : index + 1;

      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      activePointerId.current = event.pointerId;
      activeThermometerId.current = thermometer.id;
      dragMode.current = mode;
      lastFill.current = fill;
      setUndoStack((stack) => [...stack, { ...state }]);
      setRedoStack([]);
      setState((value) => ({ ...value, [thermometer.id]: fill }));
      setIsDragging(true);
      navigator.vibrate?.(7);
    },
    [cellFromEvent, solved, state]
  );

  const continueFill = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.pointerId !== activePointerId.current) return;
      const hit = cellFromEvent(event);
      if (!hit || hit.thermometer.id !== activeThermometerId.current) return;
      const fill = dragMode.current === "erase" ? hit.index : hit.index + 1;
      if (fill === lastFill.current) return;
      lastFill.current = fill;
      setState((value) => ({ ...value, [hit.thermometer.id]: fill }));
      navigator.vibrate?.(4);
    },
    [cellFromEvent]
  );

  const stopFill = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (event.pointerId !== activePointerId.current) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      activePointerId.current = null;
      activeThermometerId.current = null;
      lastFill.current = null;
      setIsDragging(false);
    },
    []
  );

  const undo = useCallback(() => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack((stack) => [...stack, { ...state }]);
    setState(previous);
    setUndoStack((stack) => stack.slice(0, -1));
  }, [state, undoStack]);

  const redo = useCallback(() => {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((stack) => [...stack, { ...state }]);
    setState(next);
    setRedoStack((stack) => stack.slice(0, -1));
  }, [redoStack, state]);

  const hint = useCallback(() => {
    const thermometer = level.thermometers.find(
      (item) => (state[item.id] ?? 0) !== level.solutionFill[item.id]
    );
    if (!thermometer) return;
    setFill(thermometer.id, level.solutionFill[thermometer.id]);
  }, [level, setFill, state]);

  const reset = useCallback(() => {
    if (Object.keys(state).length === 0) return;
    setUndoStack((stack) => [...stack, { ...state }]);
    setRedoStack([]);
    setState({});
  }, [state]);

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
            <span>已填</span>
            <strong>{counts.total}</strong>
          </div>
          <div className="status-center">
            <div className="coverage-track">
              <span
                style={{
                  width: `${targetTotal === 0 ? 0 : Math.min(100, counts.total / targetTotal * 100)}%`
                }}
              />
            </div>
            <small>从球部向管内填充</small>
          </div>
          <div>
            <span>目标</span>
            <strong>{targetTotal}</strong>
          </div>
        </div>

        <div className="board-stage">
          <div
            className={`board-shell thermometer-shell ${
              isDragging ? "is-interacting" : ""
            } ${solved ? "is-solved" : ""}`}
            style={{ aspectRatio: "1 / 1" }}
          >
            <svg
              className="thermometer-board"
              viewBox={`-0.6 -0.6 ${level.cols + 1.2} ${level.rows + 1.2}`}
              role="application"
              aria-label={`第 ${level.id} 关 温度计棋盘`}
              onPointerDown={startFill}
              onPointerMove={continueFill}
              onPointerUp={stopFill}
              onPointerCancel={stopFill}
            >
              <rect
                className="thermometer-background"
                x="-.6"
                y="-.6"
                width={level.cols + 1.2}
                height={level.rows + 1.2}
              />

              {Array.from({ length: level.rows * level.cols }, (_, index) => {
                const row = Math.floor(index / level.cols);
                const col = index % level.cols;
                return (
                  <rect
                    className="thermometer-cell"
                    key={`${row}:${col}`}
                    x={col}
                    y={row}
                    width="1"
                    height="1"
                  />
                );
              })}

              {level.thermometers.map((thermometer) => {
                const fill = state[thermometer.id] ?? 0;
                const points = thermometer.cells
                  .map((cell) => `${cell.col + 0.5},${cell.row + 0.5}`)
                  .join(" ");
                const filledPoints = thermometer.cells
                  .slice(0, fill)
                  .map((cell) => `${cell.col + 0.5},${cell.row + 0.5}`)
                  .join(" ");
                const bulb = thermometer.cells[0];
                return (
                  <g key={thermometer.id}>
                    <polyline className="thermometer-tube" points={points} />
                    {fill > 1 && (
                      <polyline
                        className="thermometer-fill"
                        points={filledPoints}
                      />
                    )}
                    <circle
                      className={`thermometer-bulb ${fill > 0 ? "is-filled" : ""}`}
                      cx={bulb.col + 0.5}
                      cy={bulb.row + 0.5}
                      r=".27"
                    />
                    {fill > 0 && (
                      <circle
                        className="thermometer-fill-tip"
                        cx={thermometer.cells[fill - 1].col + 0.5}
                        cy={thermometer.cells[fill - 1].row + 0.5}
                        r=".13"
                      />
                    )}
                  </g>
                );
              })}

              {level.colTargets.map((target, col) => (
                <text
                  className={`thermometer-count is-${getCountState(counts.cols[col], target)}`}
                  key={`c${col}`}
                  x={col + 0.5}
                  y="-.27"
                >
                  {counts.cols[col]}/{target}
                </text>
              ))}
              {level.rowTargets.map((target, row) => (
                <text
                  className={`thermometer-count is-${getCountState(counts.rows[row], target)}`}
                  key={`r${row}`}
                  x={level.cols + 0.25}
                  y={row + 0.5}
                >
                  {counts.rows[row]}/{target}
                </text>
              ))}
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

      <aside className="tool-rail thermometer-tools" aria-label="温度计工具">
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
          disabled={Object.keys(state).length === 0}
          onClick={reset}
        >
          <RotateCcw size={20} />
        </button>
      </aside>
    </>
  );
}
