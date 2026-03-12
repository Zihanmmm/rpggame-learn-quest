import { chatCompletionStream, type LlmCallContext } from "@/llm/client";
import {
  TextAnalysis,
  GameDesign,
  ScenePlan,
  SceneMeta,
  SceneDetail,
  SectionContext,
} from "@/pipeline/types";

const SCENE_SIZE_DIMENSIONS: Record<string, { w: number; h: number }> = {
  small: { w: 15, h: 12 },
  medium: { w: 20, h: 15 },
  large: { w: 25, h: 18 },
};

function buildSystemPrompt(scene: SceneMeta, isFirstScene: boolean): string {
  const dims = SCENE_SIZE_DIMENSIONS[scene.size] ?? { w: 17, h: 13 };

  return `You are an RPG event scripter for a Phaser browser RPG game. Create detailed events for the scene "${scene.name}" (${scene.description}).

CRITICAL: All dialogue text, choice text, and any player-facing strings MUST be written in Chinese (中文). This is an RPG game for Chinese-speaking players.

Map dimensions: ${dims.w}x${dims.h} tiles. Place events within these bounds (x: 1 to ${dims.w - 2}, y: 1 to ${dims.h - 2}). Avoid placing events on the edges (row/column 0 or max).

Create events of these types:
- "npc_dialogue": An NPC the player can talk to. Set trigger to "action". Include characterId and a dialogue sequence with lines. If this NPC is at a decision node, include choices in the dialogue.
- "transfer": A door or exit point that moves the player to another scene. Set trigger to "player_touch". Include transfer data with targetSceneId, targetX, targetY, targetDirection (2=down, 4=left, 6=right, 8=up).
- "autorun_cutscene": A cutscene that plays automatically when the player enters. Set trigger to "autorun". ${isFirstScene ? "This is the FIRST scene - include an opening autorun_cutscene that introduces the story." : "Only add autorun events if there is a story beat that triggers on entry."}

For dialogue choices (at decision nodes), include a "choices" array in the dialogue sequence:
{
  "text": "choice text shown to player",
  "resultDialogue": [{"speakerCharacterId": "...", "text": "..."}]
}

Keep dialogue concise - max 3-4 lines per NPC, max 2 lines per choice result.

Output JSON:
{
  "sceneId": "${scene.id}",
  "events": [
    {
      "id": "string - unique event ID like 'evt_01'",
      "type": "npc_dialogue" | "transfer" | "autorun_cutscene",
      "x": "number - tile x coordinate",
      "y": "number - tile y coordinate",
      "trigger": "action" | "player_touch" | "autorun",
      "characterId": "string (required for npc_dialogue - character ID from analysis)",
      "dialogue": {
        "id": "string",
        "lines": [{"speakerCharacterId": "string", "text": "string"}],
        "choices": [{"text": "string", "resultDialogue": [{"speakerCharacterId": "string", "text": "string"}]}]
      },
      "transfer": {
        "targetSceneId": "string - ID of the destination scene",
        "targetX": "number - spawn x in destination",
        "targetY": "number - spawn y in destination",
        "targetDirection": 2 | 4 | 6 | 8
      }
    }
  ]
}

PLACEMENT RULES:
- NPCs must be spread across the map. Keep at least 3 tiles between any two NPCs.
- Transfer events should be near map edges or doorways.
- One NPC per event. Each npc_dialogue event represents exactly ONE character. If the story has two characters in a scene, create TWO separate events.
- Every character present in a scene MUST have their own npc_dialogue event with unique position and dialogue.`;
}

export async function buildScenes(
  analysis: TextAnalysis,
  design: GameDesign,
  plan: ScenePlan,
  ctx: LlmCallContext,
  sectionCtx?: SectionContext,
): Promise<SceneDetail[]> {
  const results: SceneDetail[] = [];

  for (let i = 0; i < plan.scenes.length; i++) {
    const scene = plan.scenes[i];
    const isFirstScene = scene.id === plan.startSceneId;

    const relevantConnections = plan.connections.filter(
      (c) => c.fromSceneId === scene.id || c.toSceneId === scene.id,
    );

    const relevantAnchors = design.anchorEvents.filter(
      (a) =>
        a.locationId === scene.id ||
        findLocationScene(a.locationId, plan) === scene.id,
    );

    const relevantDecisions = design.decisionNodes.filter(
      (d) =>
        d.locationId === scene.id ||
        findLocationScene(d.locationId, plan) === scene.id,
    );

    const context = {
      scene,
      isFirstScene,
      connections: relevantConnections,
      anchors: relevantAnchors,
      decisions: relevantDecisions,
      characters: analysis.characters,
      allSceneIds: plan.scenes.map((s) => s.id),
    };

    let systemPrompt = buildSystemPrompt(scene, isFirstScene);
    if (sectionCtx) {
      systemPrompt += `\n\n--- BOOK MODE: SECTION ${sectionCtx.index + 1} of ${sectionCtx.totalSections} ---
Section: "${sectionCtx.title}". Build events for this chapter's scenes only.`;
    }
    const userPrompt = JSON.stringify(context, null, 2);

    ctx.onToken?.(`\n--- Building scene ${i + 1}/${plan.scenes.length}: ${scene.name} ---\n`);

    const detail = await chatCompletionStream<SceneDetail>(
      systemPrompt,
      userPrompt,
      { ...ctx, stage: `${ctx.stage}:${scene.id}` },
      { temperature: 0.7 },
    );

    results.push(detail);
  }

  return results;
}

function findLocationScene(
  locationId: string,
  plan: ScenePlan,
): string | undefined {
  const scene = plan.scenes.find(
    (s) =>
      s.id === locationId ||
      s.name.toLowerCase().includes(locationId.toLowerCase()),
  );
  return scene?.id;
}
