import { SYSTEM_PROMPT as TEXT_ANALYSIS_PROMPT } from "@/pipeline/text-analyzer";
import { SYSTEM_PROMPT as GAME_DESIGN_PROMPT } from "@/pipeline/game-designer";
import { SYSTEM_PROMPT as SCENE_PLANNING_PROMPT } from "@/pipeline/scene-planner";

const SCENE_BUILDING_PROMPT = `You are an RPG event scripter for an interactive learning game.
The JSON is an array of SceneDetail objects. Each has: sceneId, events[], bgmName?, bgmVolume?, screenTone?.
Each event has: id, type (npc_dialogue|transfer|autorun_cutscene|area_trigger|challenge_trigger), x, y, trigger, characterId?, dialogue?, transfer?, conditions?, challenge?.
Preserve this exact structure when making revisions.
All dialogue text, choice text, and any player-facing strings MUST be in Chinese (中文).`;

const ASSET_MAPPING_PROMPT = `This stage maps characters and scenes to game assets (sprites, tilesets, audio). Maintain the existing JSON structure.`;

const ADAPTER_PROMPT = `This stage produces the final game project files. The JSON contains { outputPath }. It is not directly editable via annotations.`;

const STATIC_PROMPTS: Record<string, string> = {
  text_analysis: TEXT_ANALYSIS_PROMPT,
  game_design: GAME_DESIGN_PROMPT,
  scene_planning: SCENE_PLANNING_PROMPT,
  scene_building: SCENE_BUILDING_PROMPT,
  asset_mapping: ASSET_MAPPING_PROMPT,
  phaser_adapter: ADAPTER_PROMPT,
};

export function getStagePrompt(stage: string): string {
  const baseStage = stage.split(":")[0];
  return STATIC_PROMPTS[baseStage] ?? "Maintain the existing JSON structure.";
}
