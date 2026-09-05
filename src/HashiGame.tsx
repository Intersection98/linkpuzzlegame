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
  findHashiConflict,
  getHashiBridges,
  getHashiHint,
  hashiProgress,
  islandDegree,
  validateHashi,
  type BridgeKey,
  type BridgeMap,
  type HashiLevel
} from "./hashi";
import WinOverlay from "./WinOverlay";
import { useCompletionSound } from "./useCompletionSound";

type HashiGameProps = {
  level: HashiLevel;
  initialBridges: BridgeMap;
  chapterComplete: boolean;
  chapterPosition: number;
  chapterLength: number;
  isChapterEnd: boolean;
  isLastLevel: boolean;
  onChange: (bridges: BridgeMap, complete: boolean) => void;
  onNext: () => void;
  onOpenLevels: () => void;
};

export default function HashiGame({
  level,
  initialBridges,
  chapterComplete,
  chapterPosition,
  chapterLength,
  isChapterEnd,
  isLastLevel,
  onChange,
  onNext,
  onOpenLevels
}: HashiGameProps) {
  const [bridges, setBridges] = useState<BridgeMap>({ ...initialBridges });
  const [undoStack, setUndoStack] = useState<BridgeMap[]>([]);
  const [redoStack, setRedoStack] = useState<BridgeMap[]>([]);
  const [feedback, setFeedback] = useState("");
  const feedbackTimer = useRef<number | undefined>(undefined);
  const candidates = useMemo(() => getHashiBridges(level), [level]);
  const progress = useMemo(
    () => hashiProgress(level, bridges),
    [bridges, level]
  );
  const solved = useMemo(
    () => validateHashi(level, bridges).complete,
    [bridges, level]
  );
  useCompletionSound(level.id, solved);

  useEffect(() => {
    onChange(bridges, solved);
  }, [bridges, onChange, solved]);

  const setBridge = useCallback(
    (key: BridgeKey, count: 0 | 1 | 2) => {
      if (solved) return;
      const next = { ...bridges };
      if (count === 0) delete next[key];
      else next[key] = count;
      const conflict = findHashiConflict(level, next);
      if (conflict) {
        if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
        setFeedback(conflict);
        navigator.vibrate?.([14, 24, 14]);
        feedbackTimer.current = window.setTimeout(() => setFeedback(""), 1200);
        return;
      }
      setUndoStack((stack) => [...stack, { ...bridges }]);
      setRedoStack([]);
      setBridges(next);
      setFeedback("");
      navigator.vibrate?.(count === 2 ? [7, 18, 7] : 7);
    },
    [bridges, level, solved]
  );

  const selectBridge = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * level.cols;
      const y = ((event.clientY - rect.top) / rect.height) * level.rows;
      let nearest: { key: BridgeKey; distance: number } | null = null;

      for (const bridge of candidates) {
        const x1 = bridge.from.col + 0.5;
        const y1 = bridge.from.row + 0.5;
        const x2 = bridge.to.col + 0.5;
        const y2 = bridge.to.row + 0.5;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;
        const t = Math.max(
          0.18,
          Math.min(0.82, ((x - x1) * dx + (y - y1) * dy) / lengthSquared)
        );
        const distance = Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy));
        if (!nearest || distance < nearest.distance) {
          nearest = { key: bridge.key, distance };
        }
      }

      const selected = nearest as { key: BridgeKey; distance: number } | null;
      if (!selected || selected.distance > 0.3) return;
      const key = selected.key;
      setBridge(key, (((bridges[key] ?? 0) + 1) % 3) as 0 | 1 | 2);
    },
    [bridges, candidates, level.cols, level.rows, setBridge]
  );

  const undo = useCallback(() => {
    const previous = undoStack.at(-1);
    if (!previous) return;
    setRedoStack((stack) => [...stack, { ...bridges }]);
    setBridges(previous);
    setUndoStack((stack) => stack.slice(0, -1));
    setFeedback("");
  }, [bridges, undoStack]);

  const redo = useCallback(() => {
    const next = redoStack.at(-1);
    if (!next) return;
    setUndoStack((stack) => [...stack, { ...bridges }]);
    setBridges(next);
    setRedoStack((stack) => stack.slice(0, -1));
    setFeedback("");
  }, [bridges, redoStack]);

  const hint = useCallback(() => {
    const nextHint = getHashiHint(level, bridges);
    if (!nextHint) return;
    setBridge(nextHint.key, nextHint.count);
  }, [bridges, level, setBridge]);

  const reset = useCallback(() => {
    if (Object.keys(bridges).length === 0) return;
    setUndoStack((stack) => [...stack, { ...bridges }]);
    setRedoStack([]);
    setBridges({});
    setFeedback("");
  }, [bridges]);

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

  useEffect(
    () => () => {
      if (feedbackTimer.current) window.clearTimeout(feedbackTimer.current);
    },
    []
  );

  return (
    <>
      <section className="play-area">
        <div className="board-status">
          <div>
            <span>桥数</span>
            <strong>{progress.bridgeCount}</strong>
          </div>
          <div className="status-center">
            <div className="coverage-track">
              <span style={{ width: `${progress.matched / progress.total * 100}%` }} />
            </div>
            <small className={feedback ? "is-warning" : ""} aria-live="polite">
              {feedback || "点击航道切换单双桥"}
            </small>
          </div>
          <div>
            <span>岛屿</span>
            <strong>{progress.matched}/{progress.total}</strong>
          </div>
        </div>

        <div className="board-stage">
          <div
            className={`board-shell hashi-shell ${solved ? "is-solved" : ""}`}
            style={{ aspectRatio: `${level.cols} / ${level.rows}` }}
          >
            <svg
              className="hashi-board"
              viewBox={`0 0 ${level.cols} ${level.rows}`}
              role="application"
              aria-label={`第 ${level.id} 关 桥梁棋盘`}
              onPointerDown={selectBridge}
            >
              <rect className="hashi-background" width={level.cols} height={level.rows} />
              {candidates.map((bridge) => {
                const x1 = bridge.from.col + 0.5;
                const y1 = bridge.from.row + 0.5;
                const x2 = bridge.to.col + 0.5;
                const y2 = bridge.to.row + 0.5;
                return (
                  <line
                    className="hashi-guide"
                    key={`guide-${bridge.key}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                  />
                );
              })}
              {candidates.map((bridge) => {
                const count = bridges[bridge.key] ?? 0;
                const x1 = bridge.from.col + 0.5;
                const y1 = bridge.from.row + 0.5;
                const x2 = bridge.to.col + 0.5;
                const y2 = bridge.to.row + 0.5;
                const offsetX = bridge.orientation === "v" ? 0.065 : 0;
                const offsetY = bridge.orientation === "h" ? 0.065 : 0;
                return (
                  <g key={bridge.key}>
                    {count === 1 && (
                      <line className="hashi-bridge" x1={x1} y1={y1} x2={x2} y2={y2} />
                    )}
                    {count === 2 && (
                      <>
                        <line className="hashi-bridge" x1={x1 - offsetX} y1={y1 - offsetY} x2={x2 - offsetX} y2={y2 - offsetY} />
                        <line className="hashi-bridge" x1={x1 + offsetX} y1={y1 + offsetY} x2={x2 + offsetX} y2={y2 + offsetY} />
                      </>
                    )}
                  </g>
                );
              })}

              {level.islands.map((island) => {
                const degree = islandDegree(level, bridges, island.id);
                const state =
                  degree === island.target
                    ? "matched"
                    : degree > island.target
                      ? "exceeded"
                      : "pending";
                return (
                  <g
                    className={`hashi-island is-${state}`}
                    key={island.id}
                    transform={`translate(${island.col + 0.5} ${island.row + 0.5})`}
                  >
                    <circle r=".31" />
                    <text y=".015">{island.target}</text>
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

      <aside className="tool-rail hashi-tools" aria-label="桥梁工具">
        <button className="icon-button" type="button" title="撤销" aria-label="撤销" disabled={undoStack.length === 0} onClick={undo}>
          <Undo2 size={21} />
        </button>
        <button className="icon-button" type="button" title="重做" aria-label="重做" disabled={redoStack.length === 0} onClick={redo}>
          <Redo2 size={21} />
        </button>
        <span className="tool-divider" />
        <button className="icon-button" type="button" title="提示" aria-label="提示" onClick={hint}>
          <Lightbulb size={21} />
        </button>
        <button className="icon-button" type="button" title="重置" aria-label="重置" disabled={Object.keys(bridges).length === 0} onClick={reset}>
          <RotateCcw size={20} />
        </button>
      </aside>
    </>
  );
}
