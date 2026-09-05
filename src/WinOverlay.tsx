import { ArrowRight, Check, X } from "lucide-react";
import { useState } from "react";

type WinOverlayProps = {
  chapterComplete: boolean;
  chapterPosition: number;
  chapterLength: number;
  levelId: number;
  isChapterEnd: boolean;
  isLastLevel: boolean;
  onNext: () => void;
  onOpenLevels: () => void;
};

export default function WinOverlay({
  chapterComplete,
  chapterPosition,
  chapterLength,
  levelId,
  isChapterEnd,
  isLastLevel,
  onNext,
  onOpenLevels
}: WinOverlayProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="win-overlay" role="status">
      <div className="win-panel">
        <button
          className="win-close"
          type="button"
          title="查看完成后的棋盘"
          aria-label="关闭通关提示"
          onClick={() => setDismissed(true)}
        >
          <X size={18} />
        </button>
        <span className="win-check">
          <Check size={36} strokeWidth={3} />
        </span>
        <div>
          <strong>{chapterComplete ? "章节完成" : "关卡完成"}</strong>
          <span>
            {chapterComplete
              ? `${chapterPosition} / ${chapterLength}`
              : `第 ${levelId} 关`}
          </span>
        </div>
        <button
          className="win-next"
          type="button"
          onClick={isLastLevel ? onOpenLevels : onNext}
        >
          {isLastLevel
            ? "选择关卡"
            : isChapterEnd
              ? "开启下一章"
              : "下一关"}
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
