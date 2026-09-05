# 连线解谜
12种共100道连线类解谜游戏。

在线游玩：<https://intersection98.github.io/linkpuzzlegame/>

共 12 章， 100 关：

- 第一章：Numberlink 数连（1–10）
- 第二章：NumberEnd 定长数连（11–18）
- 第三章：Slitherlink 数回（19–28）
- 第四章：Mejilink 区域环（29–36）
- 第五章：Pipelink 管道回路（37–44）
- 第六章：Thermometers 温度计（45–52）
- 第七章：Hashi 数桥（53–60）
- 第八章：Masyu 珍珠（61–68）
- 第九章：Mid-loop 中环（69–76）
- 第十章：Balance Loop 平衡环（77–84）
- 第十一章：Geradeweg 直线环路（85–92）
- 第十二章：Shingoki 交通灯（93–100）

## 本地运行

```bash
npm install
npm run dev
```

打开 <http://127.0.0.1:5173/>。

## Debug 模式

- 使用 `?debug=1` 解锁全部章节和关卡。
- 使用 `?debug=1&level=100` 直接进入指定关卡。
- Debug 模式中的跳关和操作不会写入正式游戏存档。

## 验证

```bash
npm test
npm run build
npm run verify:levels
```
