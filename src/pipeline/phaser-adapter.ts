import * as fs from "fs";
import * as path from "path";
import type {
  TextAnalysis,
  GameDesign,
  ScenePlan,
  SceneDetail,
  PhaserAssetMapping,
} from "@/pipeline/types";

// ---- Public interface ----

export interface PhaserAdapterInput {
  projectId: string;
  projectName: string;
  textAnalysis: TextAnalysis;
  gameDesign: GameDesign;
  scenePlan: ScenePlan;
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
  const vocabularyJson = buildVocabulary(input.textAnalysis);

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
  return { maps: assetMapping.maps };
}

function buildEvents(input: PhaserAdapterInput) {
  const { sceneDetails, textAnalysis, assetMapping } = input;

  return {
    scenes: sceneDetails.map((sd) => ({
      sceneId: sd.sceneId,
      npcs: sd.events
        .filter((e) => e.type === "npc_dialogue")
        .map((e) => ({
          id: e.id,
          name: findCharacterName(e.characterId, textAnalysis),
          x: e.x,
          y: e.y,
          spriteColor: findCharacterColor(e.characterId, assetMapping),
          dialogue: e.dialogue?.lines.map((l) => ({
            speaker: findCharacterName(l.speakerCharacterId, textAnalysis),
            text: l.text,
          })) ?? [],
          challenge: null,
        })),
      transfers: sd.events
        .filter((e) => e.type === "transfer")
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

function buildVocabulary(analysis: TextAnalysis) {
  // Future: extract vocabulary from analysis.learningElements
  return { vocabulary: [] };
}

// ---- Helpers ----

function findCharacterName(characterId: string | undefined, analysis: TextAnalysis): string {
  if (!characterId) return "???";
  const char = analysis.characters.find((c) => c.id === characterId);
  return char?.name ?? characterId;
}

function findCharacterColor(characterId: string | undefined, assetMapping: PhaserAssetMapping): string {
  if (!characterId) return "#999999";
  const asset = assetMapping.characters.find((c) => c.characterId === characterId);
  return asset?.spriteColor ?? "#999999";
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
