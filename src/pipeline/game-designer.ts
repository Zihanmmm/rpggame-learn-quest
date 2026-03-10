import { chatCompletionStream, type LlmCallContext } from "@/llm/client";
import { TextAnalysis, GameDesign, SectionContext } from "@/pipeline/types";

export const SYSTEM_PROMPT = `You are an expert RPG game designer. Convert a literary analysis into an interactive RPG game design where the player IS the protagonist (first-person perspective).

You MUST output all human-readable text values in Chinese (中文), including descriptions, choice text, prompt text, consequences, etc. Only IDs and technical fields stay in English.

Design:
- Anchor events: immutable story beats that must occur regardless of player choices. These correspond to major timeline events.
- Decision nodes: points where the player makes meaningful choices (2-4 options each). All choices eventually converge back at the next anchor event, preserving the overall narrative while giving agency.
- A game flow graph connecting anchors, decisions, transitions, and endings.

Constraints:
- 3-6 decision nodes total
- Target 10-20 minutes of playtime
- Every decision node must eventually lead back to an anchor event or ending

Output a JSON object:
{
  "protagonistId": "string - character ID of the protagonist from the analysis",
  "anchorEvents": [
    {
      "id": "string - unique ID like 'anchor_01'",
      "timelineEventId": "string - corresponding timeline event ID from analysis",
      "description": "string - what happens at this story beat",
      "locationId": "string - location ID from analysis"
    }
  ],
  "decisionNodes": [
    {
      "id": "string - unique ID like 'decision_01'",
      "locationId": "string - location ID",
      "triggerDescription": "string - what situation triggers this choice",
      "promptText": "string - the question/situation presented to the player",
      "options": [
        {
          "id": "string - unique ID like 'choice_01a'",
          "text": "string - the choice text shown to the player",
          "consequence": "string - what happens if player picks this",
          "nextNodeId": "string - ID of the next game flow node"
        }
      ]
    }
  ],
  "gameFlow": [
    {
      "id": "string - matches an anchor/decision/transition/ending ID",
      "type": "anchor" | "decision" | "transition" | "ending",
      "description": "string - what this node represents",
      "locationId": "string - location ID",
      "nextNodeIds": ["string - IDs of nodes that follow this one"]
    }
  ],
  "estimatedPlaytimeMinutes": "number - estimated playtime"
}

Use the character IDs, location IDs, and timeline event IDs from the provided analysis.`;

function buildSectionAddendum(sectionCtx: SectionContext): string {
  let addendum = `\n\n--- BOOK MODE: SECTION ${sectionCtx.index + 1} of ${sectionCtx.totalSections} ---
Section title: "${sectionCtx.title}"
Design gameplay for THIS SECTION ONLY. Use only characters and locations that appear in the section text below.
Reference character/location IDs from the global analysis.
Target 5-10 minutes of playtime for this section. Use 1-3 decision nodes.`;

  if (sectionCtx.prevSectionSummary) {
    addendum += `\n\nPrevious section summary: ${sectionCtx.prevSectionSummary}`;
  }
  if (sectionCtx.index < sectionCtx.totalSections - 1) {
    addendum += `\nThis is NOT the final section — end with a transition, not an ending node.`;
  } else {
    addendum += `\nThis is the FINAL section — include an ending node.`;
  }
  return addendum;
}

export async function designGame(
  analysis: TextAnalysis,
  ctx: LlmCallContext,
  sectionCtx?: SectionContext,
): Promise<GameDesign> {
  let systemPrompt = SYSTEM_PROMPT;
  let userPrompt: string;

  if (sectionCtx) {
    systemPrompt += buildSectionAddendum(sectionCtx);
    userPrompt = JSON.stringify(analysis, null, 2) + "\n\n--- SECTION TEXT ---\n" + sectionCtx.sectionText;
  } else {
    userPrompt = JSON.stringify(analysis, null, 2);
  }

  return chatCompletionStream<GameDesign>(systemPrompt, userPrompt, ctx, {
    temperature: 0.7,
  });
}
