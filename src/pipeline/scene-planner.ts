import { chatCompletionStream, type LlmCallContext } from "@/llm/client";
import { TextAnalysis, GameDesign, ScenePlan, SectionContext } from "@/pipeline/types";

export const SYSTEM_PROMPT = `You are an RPG scene planner. Plan the map scenes for a Phaser browser RPG based on the literary analysis and game design.

You MUST output all human-readable text values in Chinese (中文), including scene names, descriptions, atmosphere, mapTemplateHint, connection descriptions, etc. Only IDs and technical fields stay in English.

Create 3-8 map scenes. Each scene is a distinct tile-based map the player can visit.

For each scene provide:
- id: unique scene ID like "scene_01"
- name: display name for the map
- description: what this place is
- type: "indoor" or "outdoor"
- size: "small" (15x12 tiles), "medium" (20x15 tiles), or "large" (25x18 tiles)
- timeOfDay: "morning", "afternoon", "evening", or "night"
- atmosphere: the mood/feeling of this scene
- mapTemplateHint: describe what kind of map template to use, e.g. "tavern interior", "town street", "forest clearing", "mansion room", "castle hall", "village square", "cave entrance"
- visitCount: how many times the player is expected to visit (usually 1)

Define connections between scenes specifying how the player moves between them.

Output JSON:
{
  "scenes": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "type": "indoor" | "outdoor",
      "size": "small" | "medium" | "large",
      "timeOfDay": "morning" | "afternoon" | "evening" | "night",
      "atmosphere": "string",
      "mapTemplateHint": "string",
      "visitCount": "number"
    }
  ],
  "connections": [
    {
      "fromSceneId": "string",
      "toSceneId": "string",
      "transitionType": "door" | "walk" | "teleport" | "cutscene",
      "description": "string - e.g. 'Exit door to the south', 'Path leading north'"
    }
  ],
  "startSceneId": "string - the scene where the game begins"
}

Ensure the start scene matches where the first anchor event takes place.
Every scene must be reachable from the start scene through connections.
Connections should be bidirectional where appropriate (add two entries).`;

export async function planScenes(
  analysis: TextAnalysis,
  design: GameDesign,
  ctx: LlmCallContext,
  sectionCtx?: SectionContext,
): Promise<ScenePlan> {
  let systemPrompt = SYSTEM_PROMPT;

  if (sectionCtx) {
    systemPrompt += `\n\n--- BOOK MODE: SECTION ${sectionCtx.index + 1} of ${sectionCtx.totalSections} ---
Section title: "${sectionCtx.title}"
Plan 3-7 scenes for THIS SECTION ONLY.`;
    if (sectionCtx.index < sectionCtx.totalSections - 1) {
      systemPrompt += `\nThe LAST scene should have an available exit area for connecting to the next chapter.`;
    }
  }

  const userPrompt = JSON.stringify({ analysis, design }, null, 2);
  return chatCompletionStream<ScenePlan>(systemPrompt, userPrompt, ctx, {
    temperature: 0.7,
  });
}
