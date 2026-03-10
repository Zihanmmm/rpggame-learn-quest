// TODO: Replace with phaser-asset-mapper.ts in Phase 2
// Stub to maintain compilation

import type { TextAnalysis, ScenePlan } from "./types";
import type { LlmCallContext } from "@/llm/client";

export interface AssetMapping {
  characters: CharacterAsset[];
  scenes: SceneAsset[];
}

export interface CharacterAsset {
  characterId: string;
  characterName: string;
  characterImage: string;
  characterIndex: number;
  faceImage: string;
  faceIndex: number;
}

export interface SceneAsset {
  sceneId: string;
  tilesetId: number;
  sampleMapId?: number;
  bgm: { name: string; volume: number; pitch: number; pan: number };
}

export async function mapAssets(
  _analysis: TextAnalysis,
  _plan: ScenePlan,
  _ctx: LlmCallContext,
): Promise<AssetMapping> {
  throw new Error("Asset mapper not yet implemented for Phaser. Coming in Phase 2.");
}
