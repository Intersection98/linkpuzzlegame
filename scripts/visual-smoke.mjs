import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL ?? "http://127.0.0.1:4175";
const LEVELS = [
  1, 11, 19, 20, 29, 30, 37, 38, 45,
  53, 54, 55, 56, 57, 58, 59,
  60, 61, 62, 63, 64, 65, 66, 67, 68,
  69, 70, 77, 78, 79, 80, 81, 82, 83, 84,
  85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 100
];
const TUTORIAL_LEVELS = new Set([
  1, 11, 19, 20, 29, 30, 37, 38, 45, 53, 54, 61, 62, 69, 70, 77, 78, 85,
  86, 93, 94
]);
const RULE_LEVELS = new Set([1, 11, 19, 29, 37, 45, 53, 61, 69, 77, 85, 93]);
const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844, isMobile: true },
  { name: "desktop", width: 1440, height: 1000, isMobile: false }
];
const OUTPUT_DIR = "artifacts/visual-smoke";

await mkdir(OUTPUT_DIR, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH
});

const failures = [];
const results = [];

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    deviceScaleFactor: 1
  });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  for (const level of LEVELS) {
    await page.goto(`${BASE_URL}/?debug=1&level=${level}`, {
      waitUntil: "networkidle"
    });

    const rules = page.locator(".rules-modal");
    const rulesVisible = await rules.isVisible();
    let ruleTitle = null;
    if (RULE_LEVELS.has(level)) {
      if (!rulesVisible) {
        failures.push(`${viewport.name} level ${level}: rules modal missing`);
      } else {
        ruleTitle = await rules.locator("h2").innerText();
        const ruleBox = await rules.boundingBox();
        if (
          !ruleBox ||
          ruleBox.x < 0 ||
          ruleBox.y < 0 ||
          ruleBox.x + ruleBox.width > viewport.width + 1 ||
          ruleBox.y + ruleBox.height > viewport.height + 1
        ) {
          failures.push(`${viewport.name} level ${level}: rules modal overflow`);
        }
        await rules.getByRole("button", { name: "开始游戏" }).click();
      }
    } else if (rulesVisible) {
      failures.push(`${viewport.name} level ${level}: unexpected rules modal`);
    }

    const tutorial = page.locator(".tutorial-coach");
    const tutorialVisible = await tutorial.isVisible();
    let tutorialTitle = null;
    if (TUTORIAL_LEVELS.has(level)) {
      if (!tutorialVisible) {
        failures.push(`${viewport.name} level ${level}: tutorial missing`);
      } else {
        tutorialTitle = await tutorial.locator(".tutorial-copy strong").innerText();
      }
    } else if (tutorialVisible) {
      failures.push(`${viewport.name} level ${level}: unexpected tutorial`);
    }
    if (tutorialVisible) {
      const tutorialBox = await tutorial.boundingBox();
      if (
        !tutorialBox ||
        tutorialBox.x < 0 ||
        tutorialBox.y < 0 ||
        tutorialBox.x + tutorialBox.width > viewport.width + 1 ||
        tutorialBox.y + tutorialBox.height > viewport.height + 1
      ) {
        failures.push(`${viewport.name} level ${level}: tutorial overflow`);
      }
    }

    const board = page.locator(".board-shell");
    await board.waitFor({ state: "visible" });
    const metrics = await page.evaluate(() => {
      const boardElement = document.querySelector(".board-shell");
      const toolsElement = document.querySelector(".tool-rail");
      const boardRect = boardElement?.getBoundingClientRect();
      const toolsRect = toolsElement?.getBoundingClientRect();
      const overlaps =
        boardRect &&
        toolsRect &&
        boardRect.left < toolsRect.right &&
        boardRect.right > toolsRect.left &&
        boardRect.top < toolsRect.bottom &&
        boardRect.bottom > toolsRect.top;
      return {
        viewport: { width: window.innerWidth, height: window.innerHeight },
        document: {
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight
        },
        board: boardRect
          ? {
              width: boardRect.width,
              height: boardRect.height,
              top: boardRect.top,
              bottom: boardRect.bottom
            }
          : null,
        toolsOverlapBoard: Boolean(overlaps)
      };
    });

    if (metrics.document.width > metrics.viewport.width + 1) {
      failures.push(
        `${viewport.name} level ${level}: horizontal overflow ${metrics.document.width}/${metrics.viewport.width}`
      );
    }
    if (
      !metrics.board ||
      metrics.board.width < 260 ||
      metrics.board.height < 260
    ) {
      failures.push(
        `${viewport.name} level ${level}: board too small ${JSON.stringify(metrics.board)}`
      );
    }
    if (metrics.toolsOverlapBoard) {
      failures.push(`${viewport.name} level ${level}: tools overlap board`);
    }
    if (level >= 85 && level <= 92) {
      const lengthClues = board.locator(".loop-clue.length");
      const clueCount = await lengthClues.count();
      const backedClueCount = await lengthClues
        .filter({ has: page.locator(".loop-clue-disc") })
        .count();
      if (clueCount === 0 || backedClueCount !== clueCount) {
        failures.push(
          `${viewport.name} level ${level}: length clue background missing`
        );
      }
    }

    const hint = page.getByRole("button", { name: "提示" });
    const before = await board.locator("svg").innerHTML();
    await hint.click();
    await page.waitForTimeout(80);
    const after = await board.locator("svg").innerHTML();
    if (before === after) {
      failures.push(`${viewport.name} level ${level}: hint changed no board state`);
    }
    if (level >= 53 && level <= 60) {
      await page.getByRole("button", { name: "撤销" }).click();
      await page.waitForTimeout(80);
      const afterUndo = await board.locator("svg").innerHTML();
      if (afterUndo !== before) {
        failures.push(`${viewport.name} level ${level}: undo did not restore board`);
      }

      await page.getByRole("button", { name: "重做" }).click();
      await page.waitForTimeout(80);
      const afterRedo = await board.locator("svg").innerHTML();
      if (afterRedo !== after) {
        failures.push(`${viewport.name} level ${level}: redo did not restore bridge`);
      }
      const layerOrder = await board
        .locator(".hashi-guide, .hashi-bridge")
        .evaluateAll((elements) =>
          elements.map((element) =>
            element.classList.contains("hashi-guide") ? "guide" : "bridge"
          )
        );
      if (layerOrder.lastIndexOf("guide") > layerOrder.indexOf("bridge")) {
        failures.push(
          `${viewport.name} level ${level}: guide rendered above bridge`
        );
      }

      if (level === 56) {
        const hashiBoard = page.locator(".hashi-board");
        const hashiBox = await hashiBoard.boundingBox();
        if (!hashiBox) {
          failures.push(`${viewport.name} level ${level}: missing Hashi board`);
        } else {
          await page.mouse.click(
            hashiBox.x + hashiBox.width * 4.5 / 6,
            hashiBox.y + hashiBox.height * 4 / 6
          );
          await page.waitForTimeout(80);
          const beforeConflict = await hashiBoard.innerHTML();
          if (beforeConflict === afterRedo) {
            failures.push(
              `${viewport.name} level ${level}: crossing setup bridge was not placed`
            );
          }

          await page.mouse.click(
            hashiBox.x + hashiBox.width * 3.5 / 6,
            hashiBox.y + hashiBox.height * 4.5 / 6
          );
          await page.waitForTimeout(80);
          const afterConflict = await hashiBoard.innerHTML();
          const conflictFeedback = await page
            .locator(".board-status small")
            .innerText();
          if (
            afterConflict !== beforeConflict ||
            conflictFeedback !== "桥梁不能交叉"
          ) {
            failures.push(
              `${viewport.name} level ${level}: crossing bridge was not rejected`
            );
          }

          await page.getByRole("button", { name: "提示" }).click();
          await page.waitForTimeout(80);
          if ((await hashiBoard.innerHTML()) !== afterRedo) {
            failures.push(
              `${viewport.name} level ${level}: hint did not remove wrong bridge`
            );
          }
        }
      }
    }

    await page.screenshot({
      path: `${OUTPUT_DIR}/${viewport.name}-${String(level).padStart(3, "0")}.png`,
      fullPage: false
    });
    results.push({
      viewport: viewport.name,
      level,
      ruleTitle,
      tutorialTitle,
      board: metrics.board,
      pageHeight: metrics.document.height
    });
  }

  if (consoleErrors.length > 0) {
    failures.push(
      `${viewport.name}: console errors\n${[...new Set(consoleErrors)].join("\n")}`
    );
  }
  await context.close();
}

await browser.close();

console.log(JSON.stringify(results, null, 2));
if (failures.length > 0) {
  console.error(`\nVisual smoke failures (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`\nVisual smoke passed for ${results.length} level/viewport checks.`);
}
