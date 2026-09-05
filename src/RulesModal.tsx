import { Maximize, Play, Puzzle, Ruler, X } from "lucide-react";
import type { PuzzleMode } from "./game";

const MODE_RULES: Record<
  PuzzleMode,
  { title: string; items: [string, string, string, string] }
> = {
  numberlink: {
    title: "数连",
    items: [
      "连接棋盘上所有颜色相同的端点。",
      "连线必须铺满棋盘上的每一个格子。",
      "不同颜色的连线不能交叉或重叠。",
      "点击已有路径可以从当前位置擦除并续连。"
    ]
  },
  "number-end": {
    title: "定长数连",
    items: [
      "连接两个数字相同的端点。",
      "数字是路径占用的总格数，包含两个端点。",
      "所有路径必须长度准确，并铺满整个棋盘。",
      "路径不能交叉、重叠或穿过其他数字。"
    ]
  },
  slitherlink: {
    title: "数回",
    items: [
      "沿网格点之间画线，最终形成一个闭合环。",
      "格内数字表示四条边中恰好有多少条属于环。",
      "数字匹配变绿、超出变红，临时小环可以继续修改。",
      "线条不能分叉；通关时所有线段必须组成同一个环。"
    ]
  },
  mejilink: {
    title: "区域环",
    items: [
      "沿区域边界画线，最终形成一个闭合环。",
      "每个封闭区域未使用的边数必须等于该区域的面积。",
      "边数满足面积条件时，整个区域会点亮为绿色。",
      "线条不能分叉；通关时只能保留一个完整环。"
    ]
  },
  pipelink: {
    title: "管道回路",
    items: [
      "连接相邻格子的中心，让连续管道经过每一个可用格。",
      "青色管件的方向已经固定，不能擦除或改向。",
      "管道可以正交交叉；交叉处横管与竖管互不连通。",
      "所有管段最终必须首尾相接，组成一条连续回路。"
    ]
  },
  thermometers: {
    title: "温度计",
    items: [
      "点击温度计管身，从球部开始连续填充。",
      "再次点击已填部分，可以从该位置向后擦除。",
      "棋盘上方和右侧数字是每列、每行的填充总数。",
      "所有行列计数同时匹配即可过关。"
    ]
  },
  hashi: {
    title: "数桥",
    items: [
      "点击同排或同列相邻岛屿之间的航道架桥。",
      "连续点击可在零座、单桥和双桥之间切换。",
      "岛屿数字等于与其相连的数桥总数。",
      "数桥不能交叉，所有岛屿最终必须连成一个网络。"
    ]
  },
  masyu: {
    title: "珍珠",
    items: [
      "沿格心画出一个不分叉、不交叉的单环。",
      "白珠处必须直行，并在相邻至少一格转弯。",
      "黑珠处必须转弯，且转弯后的两侧各直行一格。",
      "提示匹配变绿，形状冲突时变红。"
    ]
  },
  midloop: {
    title: "中环",
    items: [
      "沿格心画出一个完整单环。",
      "每个圆点必须位于一段直线的正中央。",
      "圆点到直线两端转角的距离必须相等。",
      "圆点可能位于格心，也可能位于两个格心之间。"
    ]
  },
  "balance-loop": {
    title: "平衡环",
    items: [
      "沿格心画出一个完整单环。",
      "白圈两侧直线臂等长，黑圈两侧直线臂不等长。",
      "圈内数字表示两侧直线臂长度之和。",
      "提示匹配变绿，形状或长度冲突时变红。"
    ]
  },
  geradeweg: {
    title: "直线环路",
    items: [
      "沿格心画出一个完整单环。",
      "直穿数字时，前后两个转角之间的线段数量等于该数字。",
      "在数字处转弯时，向两侧延伸的直线段长度都等于该数字。",
      "结合多个数字共同确定转角和直线段。"
    ]
  },
  shingoki: {
    title: "交通灯",
    items: [
      "沿格心画出一个完整单环。",
      "白灯必须直行，黑灯必须转弯，灰灯不限制形状。",
      "灯内数字表示两侧直线臂长度之和。",
      "同时满足颜色、长度和单环约束才可过关。"
    ]
  }
};

const RULE_ICONS = [Puzzle, Ruler, Maximize, X] as const;

type RulesModalProps = {
  chapterLabel: string;
  mode: PuzzleMode;
  onStart: () => void;
};

export default function RulesModal({
  chapterLabel,
  mode,
  onStart
}: RulesModalProps) {
  const rules = MODE_RULES[mode];

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onPointerDown={(event) => {
        if (event.currentTarget === event.target) onStart();
      }}
    >
      <section
        className="rules-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
      >
        <p className="rules-kicker">{chapterLabel}</p>
        <h2 id="rules-title">{rules.title}</h2>
        <ul className="rules-list">
          {rules.items.map((item, index) => {
            const RuleIcon = RULE_ICONS[index];
            return (
              <li key={item}>
                <span className="rule-icon">
                  <RuleIcon size={16} />
                </span>
                <span>{item}</span>
              </li>
            );
          })}
        </ul>
        <button type="button" onClick={onStart}>
          <Play size={18} fill="currentColor" />
          开始游戏
        </button>
      </section>
    </div>
  );
}
