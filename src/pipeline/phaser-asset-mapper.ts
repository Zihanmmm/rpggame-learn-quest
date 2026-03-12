import type {
  TextAnalysis,
  ScenePlan,
  SceneMeta,
  SceneDetail,
  PhaserAssetMapping,
  PhaserCharacterAsset,
  PhaserMapData,
} from "@/pipeline/types";

// ---- Character color palette ----

const CHARACTER_COLORS = [
  "#e6a23c", "#f56c6c", "#67c23a", "#409eff",
  "#9b59b6", "#e67e22", "#1abc9c", "#e74c3c",
  "#3498db", "#2ecc71", "#f39c12", "#8e44ad",
];

// ---- Scene size mappings ----

const SCENE_SIZES: Record<string, { w: number; h: number }> = {
  small: { w: 15, h: 12 },
  medium: { w: 20, h: 15 },
  large: { w: 25, h: 18 },
};

// ---- Tile constants ----
// ground: 0=grass, 1=path, 2=wall, 3=water, 4=floor, 5=door

const GRASS = 0;
const PATH = 1;
const WALL = 2;
const WATER = 3;
const FLOOR = 4;
const DOOR = 5;

// ---- Main export ----

export function mapPhaserAssets(
  analysis: TextAnalysis,
  plan: ScenePlan,
  sceneDetails: SceneDetail[],
): PhaserAssetMapping {
  const characters = mapCharacters(analysis);
  const maps = plan.scenes.map((scene) => {
    const detail = sceneDetails.find((d) => d.sceneId === scene.id);
    return generateMap(scene, plan, detail);
  });

  return { characters, maps };
}

// ---- Character mapping ----

function mapCharacters(analysis: TextAnalysis): PhaserCharacterAsset[] {
  return analysis.characters.map((char, i) => ({
    characterId: char.id,
    name: char.name,
    spriteColor: CHARACTER_COLORS[i % CHARACTER_COLORS.length],
  }));
}

// ---- Map generation ----

function generateMap(
  scene: SceneMeta,
  plan: ScenePlan,
  detail?: SceneDetail,
): PhaserMapData {
  const { w, h } = SCENE_SIZES[scene.size] ?? SCENE_SIZES.medium;

  const ground = createGrid(w, h, scene.type === "indoor" ? FLOOR : GRASS);
  const collision = createGrid(w, h, 0);

  if (scene.type === "indoor") {
    generateIndoorMap(ground, collision, w, h, scene, plan, detail);
  } else {
    generateOutdoorMap(ground, collision, w, h, scene, plan, detail);
  }

  const playerSpawn = findPlayerSpawn(ground, collision, w, h, scene, plan);

  return {
    sceneId: scene.id,
    name: scene.name,
    width: w,
    height: h,
    ground,
    collision,
    playerSpawn,
  };
}

function createGrid(w: number, h: number, fill: number): number[][] {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

// ---- Outdoor map generation ----

function generateOutdoorMap(
  ground: number[][],
  collision: number[][],
  w: number,
  h: number,
  scene: SceneMeta,
  plan: ScenePlan,
  detail?: SceneDetail,
): void {
  // 1. Draw horizontal main path through center ±1 row
  const centerY = Math.floor(h / 2);
  for (let x = 0; x < w; x++) {
    ground[centerY][x] = PATH;
    ground[centerY - 1][x] = PATH;
  }

  // 2. Draw vertical branch paths to NPC positions
  if (detail) {
    for (const evt of detail.events) {
      if (evt.type === "npc_dialogue" && evt.y >= 0 && evt.y < h && evt.x >= 0 && evt.x < w) {
        const fromY = centerY;
        const toY = Math.min(Math.max(evt.y, 1), h - 2);
        const x = Math.min(Math.max(evt.x, 1), w - 2);
        const minY = Math.min(fromY, toY);
        const maxY = Math.max(fromY, toY);
        for (let y = minY; y <= maxY; y++) {
          ground[y][x] = PATH;
        }
      }
    }
  }

  // 3. Place building outlines (wall) in corners
  placeBuilding(ground, collision, 1, 1, 3, 3);
  placeBuilding(ground, collision, w - 4, 1, 3, 3);

  // 4. Optional water area if atmosphere mentions water/river
  if (scene.atmosphere.match(/水|河|湖|海|river|water|lake|ocean/i)) {
    const waterY = h - 3;
    for (let x = 2; x < w - 2; x++) {
      ground[waterY][x] = WATER;
      collision[waterY][x] = 1;
      ground[waterY + 1][x] = WATER;
      collision[waterY + 1][x] = 1;
    }
  }

  // 5. Place transfer events at map edges
  placeTransferDoors(ground, collision, w, h, scene, plan);
}

function placeBuilding(
  ground: number[][],
  collision: number[][],
  startX: number,
  startY: number,
  bw: number,
  bh: number,
): void {
  for (let y = startY; y < startY + bh && y < ground.length; y++) {
    for (let x = startX; x < startX + bw && x < ground[0].length; x++) {
      ground[y][x] = WALL;
      collision[y][x] = 1;
    }
  }
}

// ---- Indoor map generation ----

function generateIndoorMap(
  ground: number[][],
  collision: number[][],
  w: number,
  h: number,
  scene: SceneMeta,
  plan: ScenePlan,
  _detail?: SceneDetail,
): void {
  // 1. Fill border with wall
  for (let x = 0; x < w; x++) {
    ground[0][x] = WALL;
    collision[0][x] = 1;
    ground[h - 1][x] = WALL;
    collision[h - 1][x] = 1;
  }
  for (let y = 0; y < h; y++) {
    ground[y][0] = WALL;
    collision[y][0] = 1;
    ground[y][w - 1] = WALL;
    collision[y][w - 1] = 1;
  }

  // 2. Interior already filled with FLOOR

  // 3. Place doors at transfer exit positions on border
  placeTransferDoors(ground, collision, w, h, scene, plan);
}

// ---- Transfer door placement ----

function placeTransferDoors(
  ground: number[][],
  collision: number[][],
  w: number,
  h: number,
  scene: SceneMeta,
  plan: ScenePlan,
): void {
  const connections = plan.connections.filter(
    (c) => c.fromSceneId === scene.id,
  );

  const doorPositions = [
    { x: Math.floor(w / 2), y: h - 1 },     // bottom center
    { x: Math.floor(w / 2), y: 0 },          // top center
    { x: 0, y: Math.floor(h / 2) },          // left center
    { x: w - 1, y: Math.floor(h / 2) },      // right center
  ];

  for (let i = 0; i < connections.length && i < doorPositions.length; i++) {
    const pos = doorPositions[i];
    ground[pos.y][pos.x] = DOOR;
    collision[pos.y][pos.x] = 0; // walkable
  }
}

// ---- Player spawn ----

function findPlayerSpawn(
  ground: number[][],
  collision: number[][],
  w: number,
  h: number,
  scene: SceneMeta,
  plan: ScenePlan,
): { x: number; y: number } {
  // If this is the start scene, spawn near center
  if (scene.id === plan.startSceneId) {
    return { x: Math.floor(w / 2), y: Math.floor(h / 2) + 1 };
  }

  // Otherwise spawn near the first door/entrance
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (ground[y][x] === DOOR) {
        // Spawn one tile inward from the door
        const spawnX = x === 0 ? 1 : x === w - 1 ? w - 2 : x;
        const spawnY = y === 0 ? 1 : y === h - 1 ? h - 2 : y;
        return { x: spawnX, y: spawnY };
      }
    }
  }

  // Fallback: center
  return { x: Math.floor(w / 2), y: Math.floor(h / 2) };
}
