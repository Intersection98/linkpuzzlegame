import type { EdgeKey } from "./slitherlink";
import { parseRegions, type MejilinkLevel } from "./mejilink";

type MejilinkSeed = {
  id: number;
  title: string;
  difficulty: string;
  source: string;
  regionGrid: string[];
  playableEdges: string;
  clueRegionIds: string[];
  solution: string;
};

const SEEDS: MejilinkSeed[] = [
  {
    id: 29,
    title: "区域边界",
    difficulty: "入门",
    source: "https://puzz.link/p?mejilink/4/4/g9rm4",
    regionGrid: ["0,0,1,2", "3,0,1,2", "0,0,1,4", "1,1,1,1"],
    playableEdges: "v:0:2 v:0:3 v:1:1 v:1:2 v:1:3 v:2:2 v:2:3 h:1:0 h:2:0 h:2:3 h:3:0 h:3:1 h:3:3 h:0:0 h:0:1 h:0:2 h:0:3 h:4:0 h:4:1 h:4:2 h:4:3 v:0:0 v:1:0 v:2:0 v:3:0 v:0:4 v:1:4 v:2:4 v:3:4",
    clueRegionIds: ["0", "1", "2", "3", "4"],
    solution: "h:0:0 h:0:1 h:0:2 h:0:3 h:1:0 h:2:0 h:2:3 h:3:3 h:4:0 h:4:1 h:4:2 h:4:3 v:0:0 v:0:4 v:1:1 v:1:4 v:2:0 v:2:3 v:3:0 v:3:4"
  },
  {
    id: 30,
    title: "边界缺口",
    difficulty: "简单",
    source: "https://puzz.link/p?mejilink/4/4/mr9v6",
    regionGrid: ["0,0,1,1", "2,2,1,1", "2,2,1,1", "3,3,1,1"],
    playableEdges: "v:0:2 v:1:2 v:2:2 v:3:2 h:1:0 h:1:1 h:3:0 h:3:1 h:0:0 h:0:1 h:0:2 h:0:3 h:4:0 h:4:1 h:4:2 h:4:3 v:0:0 v:1:0 v:2:0 v:3:0 v:0:4 v:1:4 v:2:4 v:3:4",
    clueRegionIds: ["0", "1", "2", "3"],
    solution: "h:0:0 h:0:1 h:4:0 h:4:1 v:0:0 v:0:2 v:1:0 v:1:2 v:2:0 v:2:2 v:3:0 v:3:2"
  },
  {
    id: 31,
    title: "内外区域",
    difficulty: "简单",
    source: "https://puzz.link/p?mejilink/4/5/vhvv6fg",
    regionGrid: ["0,0,0,0", "0,0,0,0", "0,1,2,0", "0,0,0,0", "0,0,0,0"],
    playableEdges: "v:2:1 v:2:2 v:2:3 h:2:1 h:2:2 h:3:1 h:3:2 h:0:0 h:0:1 h:0:2 h:0:3 h:5:0 h:5:1 h:5:2 h:5:3 v:0:0 v:1:0 v:2:0 v:3:0 v:4:0 v:0:4 v:1:4 v:2:4 v:3:4 v:4:4",
    clueRegionIds: ["0", "1", "2"],
    solution: "h:2:1 h:2:2 h:3:1 h:3:2 v:2:1 v:2:3"
  },
  {
    id: 32,
    title: "共享边",
    difficulty: "进阶",
    source: "https://puzz.link/p?mejilink/6/4/c2p40ogk1220",
    regionGrid: ["0,1,1,1,2,3", "4,5,6,7,7,3", "4,4,4,8,7,7", "9,a,8,8,b,7"],
    playableEdges: "v:0:1 v:0:4 v:0:5 v:1:1 v:1:2 v:1:3 v:1:5 v:2:3 v:2:4 v:3:1 v:3:2 v:3:4 v:3:5 h:1:0 h:1:1 h:1:2 h:1:3 h:1:4 h:2:1 h:2:2 h:2:3 h:2:5 h:3:0 h:3:1 h:3:2 h:3:4 h:0:0 h:0:1 h:0:2 h:0:3 h:0:4 h:0:5 h:4:1 h:4:2 h:4:3 h:4:5 v:0:0 v:1:0 v:2:0 v:0:6 v:1:6 v:2:6 v:3:6",
    clueRegionIds: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "a"],
    solution: "h:0:0 h:0:1 h:0:2 h:0:3 h:0:5 h:1:0 h:1:2 h:1:4 h:2:1 h:3:1 h:3:2 h:3:4 h:4:1 h:4:2 h:4:3 h:4:5 v:0:0 v:0:4 v:0:5 v:0:6 v:1:1 v:1:2 v:1:3 v:1:6 v:2:3 v:2:6 v:3:1 v:3:4 v:3:5 v:3:6"
  },
  {
    id: 33,
    title: "区域链",
    difficulty: "困难",
    source: "https://puzz.link/p?mejilink/5/5/389044ga8169",
    regionGrid: ["0,1,2,3,3", "4,4,2,2,5", "6,7,2,8,8", "6,9,a,a,b", "c,9,d,a,e"],
    playableEdges: "v:0:1 v:0:2 v:0:3 v:1:2 v:1:4 v:2:1 v:2:2 v:2:3 v:3:1 v:3:2 v:3:4 v:4:1 v:4:2 v:4:3 v:4:4 h:1:0 h:1:1 h:1:3 h:1:4 h:2:0 h:2:1 h:2:3 h:2:4 h:3:1 h:3:2 h:3:3 h:3:4 h:4:0 h:4:2 h:4:4 h:0:0 h:0:2 h:0:3 h:0:4 h:5:0 h:5:1 h:5:2 h:5:3 v:0:0 v:1:0 v:4:0 v:0:5 v:2:5 v:3:5",
    clueRegionIds: ["0", "2", "3", "4", "7", "8", "9", "a", "b", "c", "d"],
    solution: "h:0:0 h:0:2 h:0:3 h:0:4 h:1:1 h:1:4 h:2:0 h:2:1 h:2:3 h:3:1 h:3:3 h:3:4 h:4:0 h:4:2 h:4:4 h:5:0 h:5:1 h:5:3 v:0:0 v:0:1 v:0:2 v:0:5 v:1:0 v:1:4 v:2:2 v:2:3 v:3:1 v:3:5 v:4:0 v:4:2 v:4:3 v:4:4"
  },
  {
    id: 34,
    title: "交错区域",
    difficulty: "困难",
    source: "https://puzz.link/p?mejilink/5/5/a905q0j8",
    regionGrid: ["0,1,1,2,2", "0,1,2,2,3", "4,5,5,6,7", "4,8,9,6,7", "a,8,8,b,b"],
    playableEdges: "v:0:1 v:0:3 v:1:1 v:1:2 v:1:4 v:2:1 v:2:3 v:2:4 v:3:1 v:3:2 v:3:3 v:3:4 v:4:1 v:4:3 h:1:2 h:1:4 h:2:0 h:2:1 h:2:2 h:2:3 h:2:4 h:3:1 h:3:2 h:4:0 h:4:2 h:4:3 h:4:4 h:0:0 h:0:1 h:0:2 h:0:3 h:0:4 h:5:0 h:5:1 h:5:2 h:5:3 h:5:4 v:0:0 v:1:0 v:2:0 v:3:0 v:4:0 v:0:5 v:1:5 v:2:5 v:3:5 v:4:5",
    clueRegionIds: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b"],
    solution: "h:0:0 h:0:1 h:0:2 h:1:2 h:1:4 h:2:0 h:2:2 h:3:2 h:4:0 h:4:2 h:4:3 h:5:0 h:5:1 h:5:2 h:5:3 h:5:4 v:0:0 v:0:3 v:1:0 v:1:2 v:1:4 v:1:5 v:2:1 v:2:3 v:2:4 v:2:5 v:3:1 v:3:2 v:3:4 v:3:5 v:4:0 v:4:5"
  },
  {
    id: 35,
    title: "区域交锁",
    difficulty: "专家",
    source: "https://puzz.link/p?mejilink/6/6/q3gu4m02842s",
    regionGrid: ["0,0,0,1,1,2", "3,4,5,6,6,6", "7,7,5,8,9,6", "a,a,a,a,a,6", "b,c,d,d,e,6", "c,c,d,d,d,f"],
    playableEdges: "v:0:3 v:0:5 v:1:1 v:1:2 v:1:3 v:2:2 v:2:3 v:2:4 v:2:5 v:3:5 v:4:1 v:4:2 v:4:4 v:4:5 v:5:2 v:5:5 h:1:0 h:1:1 h:1:2 h:1:3 h:1:4 h:1:5 h:2:0 h:2:1 h:2:3 h:2:4 h:3:0 h:3:1 h:3:2 h:3:3 h:3:4 h:4:0 h:4:1 h:4:2 h:4:3 h:4:4 h:5:0 h:5:4 h:5:5 h:0:0 h:0:1 h:0:2 h:0:3 h:0:4 h:0:5 h:6:0 h:6:1 h:6:2 h:6:3 h:6:4 h:6:5 v:0:0 v:1:0 v:2:0 v:3:0 v:4:0 v:5:0 v:0:6 v:1:6 v:2:6 v:3:6 v:4:6 v:5:6",
    clueRegionIds: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f"],
    solution: "h:0:0 h:0:1 h:0:2 h:0:3 h:0:4 h:0:5 h:1:1 h:1:3 h:1:4 h:1:5 h:2:0 h:2:4 h:3:0 h:3:1 h:3:3 h:4:0 h:4:4 h:5:0 h:5:4 h:5:5 h:6:0 h:6:1 h:6:2 h:6:3 h:6:4 h:6:5 v:0:0 v:0:6 v:1:0 v:1:1 v:1:2 v:1:3 v:2:2 v:2:3 v:2:4 v:2:5 v:3:0 v:3:5 v:4:1 v:4:4 v:5:0 v:5:6"
  },
  {
    id: 36,
    title: "区域终局",
    difficulty: "极限",
    source: "https://puzz.link/p?mejilink/7/7/9l6nk6qdbkuh57kvs",
    regionGrid: ["0,1,1,2,3,3,3", "4,1,1,2,2,3,5", "1,1,1,2,2,5,5", "2,2,2,2,6,6,5", "7,2,7,6,6,6,5", "7,7,7,8,8,6,5", "7,7,7,8,8,6,6"],
    playableEdges: "v:0:1 v:0:3 v:0:4 v:1:1 v:1:3 v:1:5 v:1:6 v:2:3 v:2:5 v:3:4 v:3:6 v:4:1 v:4:2 v:4:3 v:4:6 v:5:3 v:5:5 v:5:6 v:6:3 v:6:5 h:1:0 h:1:4 h:1:6 h:2:0 h:2:5 h:3:0 h:3:1 h:3:2 h:3:4 h:3:5 h:4:0 h:4:2 h:4:3 h:5:1 h:5:3 h:5:4 h:6:6 h:0:0 h:0:1 h:0:2 h:0:3 h:0:4 h:0:5 h:0:6 h:7:0 h:7:1 h:7:2 h:7:3 h:7:4 h:7:5 h:7:6 v:0:0 v:1:0 v:2:0 v:3:0 v:4:0 v:5:0 v:6:0 v:0:7 v:1:7 v:2:7 v:3:7 v:4:7 v:5:7 v:6:7",
    clueRegionIds: ["0", "1", "2", "3", "4", "5", "6", "7", "8"],
    solution: "h:0:0 h:0:1 h:0:2 h:0:3 h:1:0 h:1:4 h:1:6 h:2:0 h:2:5 h:4:0 h:4:2 h:5:1 h:5:3 h:5:4 h:7:5 h:7:6 v:0:0 v:0:4 v:1:1 v:1:5 v:1:6 v:1:7 v:2:0 v:2:7 v:3:0 v:3:7 v:4:1 v:4:2 v:4:3 v:4:7 v:5:5 v:5:7 v:6:5 v:6:7"
  }
];

export const MEJILINK_LEVELS: MejilinkLevel[] = SEEDS.map((seed) => {
  const { grid, regions } = parseRegions(seed.regionGrid);
  const playableEdges = seed.playableEdges.split(" ") as EdgeKey[];
  const playable = new Set(playableEdges);
  const clueRegionIds = new Set(seed.clueRegionIds);
  return {
    id: seed.id,
    chapter: 4,
    chapterTitle: "区域环",
    mode: "mejilink",
    title: seed.title,
    difficulty: seed.difficulty,
    rows: grid.length,
    cols: grid[0].length,
    colors: [],
    endpoints: {},
    solution: {},
    regionGrid: grid,
    regions: regions
      .filter((region) => clueRegionIds.has(region.id))
      .map((region) => ({
        ...region,
        boundaryEdges: region.boundaryEdges.filter((edge) =>
          playable.has(edge)
        )
      })),
    playableEdges,
    solutionEdges: seed.solution.split(" ") as EdgeKey[]
  };
});
