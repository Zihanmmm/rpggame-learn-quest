import * as fs from "fs";
import * as path from "path";
import type {
  TextAnalysis,
  SceneDetail,
  PhaserAssetMapping,
} from "@/pipeline/types";

// ---- Public interface ----

export interface PhaserAdapterInput {
  projectId: string;
  projectName: string;
  textAnalysis: TextAnalysis;
  sceneDetails: SceneDetail[];
  assetMapping: PhaserAssetMapping;
}

/**
 * Copies the Phaser template and generates data JSONs.
 * Returns the output directory path.
 */
export async function adaptToPhaser(input: PhaserAdapterInput): Promise<string> {
  const outputDir = path.join(process.cwd(), "generated", input.projectId);

  // 1. Copy template
  const templateDir = path.join(process.cwd(), "src", "phaser", "template");
  copyDirSync(templateDir, outputDir);

  // 2. Generate data files
  const dataDir = path.join(outputDir, "data");
  fs.mkdirSync(dataDir, { recursive: true });

  const configJson = buildConfig(input);
  const mapsJson = buildMaps(input.assetMapping);
  const eventsJson = buildEvents(input);
  const vocabularyJson = buildVocabulary();

  fs.writeFileSync(path.join(dataDir, "config.json"), JSON.stringify(configJson, null, 2));
  fs.writeFileSync(path.join(dataDir, "maps.json"), JSON.stringify(mapsJson, null, 2));
  fs.writeFileSync(path.join(dataDir, "events.json"), JSON.stringify(eventsJson, null, 2));
  fs.writeFileSync(path.join(dataDir, "vocabulary.json"), JSON.stringify(vocabularyJson, null, 2));

  return outputDir;
}

// ---- Data builders ----

function buildConfig(input: PhaserAdapterInput) {
  return {
    title: input.projectName,
    subtitle: `基于「${input.textAnalysis.title}」生成的 RPG 游戏`,
    tileSize: 32,
    playerSprite: "player",
  };
}

function buildMaps(assetMapping: PhaserAssetMapping) {
  return {
    maps: assetMapping.maps.map((m) => ({
      id: m.sceneId,
      name: m.name,
      width: m.width,
      height: m.height,
      layers: {
        ground: m.ground,
        collision: m.collision,
      },
      playerSpawn: m.playerSpawn,
    })),
  };
}

function buildEvents(input: PhaserAdapterInput) {
  const { sceneDetails, textAnalysis, assetMapping } = input;

  // Build lookup maps to avoid O(n) find() per event
  const nameById = new Map(textAnalysis.characters.map((c) => [c.id, c.name]));
  const colorById = new Map(assetMapping.characters.map((c) => [c.characterId, c.spriteColor]));

  const charName = (id?: string) => (id && nameById.get(id)) ?? id ?? "???";
  const charColor = (id?: string) => (id && colorById.get(id)) ?? "#999999";

  return {
    scenes: sceneDetails.map((sd) => ({
      sceneId: sd.sceneId,
      npcs: sd.events
        .filter((e) => e.type === "npc_dialogue")
        .map((e) => ({
          id: e.id,
          name: charName(e.characterId),
          x: e.x,
          y: e.y,
          spriteColor: charColor(e.characterId),
          dialogue: e.dialogue?.lines.map((l) => ({
            speaker: charName(l.speakerCharacterId),
            text: l.text,
          })) ?? [],
          challenge: null,
        })),
      transfers: sd.events
        .filter((e) => e.type === "transfer" && e.transfer)
        .map((e) => ({
          id: e.id,
          x: e.x,
          y: e.y,
          width: 1,
          height: 1,
          targetScene: e.transfer!.targetSceneId,
          targetX: e.transfer!.targetX,
          targetY: e.transfer!.targetY,
        })),
    })),
  };
}

function buildVocabulary() {
  return { vocabulary: [] };
}

function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
