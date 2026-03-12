# Phase 2: Pipeline Integration — Implementation Plan

> **Status:** IMPLEMENTED (2026-03-12). Tasks 2-5 (learning-specific prompt changes) deferred to future phase.

**Goal:** Connect the AI pipeline to generate Phaser-compatible `data/*.json` files so that uploading an article/book produces a playable RPG game.

**Architecture:** Stages 1-5 remain LLM-driven (unchanged). Stage 6 (phaser-asset-mapper) is a NEW deterministic module that generates tile maps and character colors procedurally — no LLM call. Stage 7 (phaser-adapter) is a NEW deterministic module that assembles the 4 JSON files and copies the Phaser template to the output directory. The old `asset-mapper.ts` and `rpgmaker-adapter.ts` stubs are replaced.

**Deferred to future:** Vocabulary extraction (Task 2), challenge nodes (Task 3), scene planner Phaser sizes (Task 4), challenge events in scene builder (Task 5). These are tracked in the design doc under "Future TODOs".

**Tech Stack:** TypeScript, Node.js `fs`/`path` for file I/O, no new dependencies.

**Data Flow:**
```
TextAnalysis (+ learningElements.vocabulary)
  → GameDesign (+ challenge nodes referencing vocabIds)
    → ScenePlan (scenes + connections)
      → SceneDetail[] (+ challenge events attached to NPCs)
        → PhaserMapData (deterministic tile generation from scene metadata)
          → Output: generated/<project-id>/
              ├── index.html + src/  (copied from template)
              └── data/  (config.json, maps.json, events.json, vocabulary.json)
```

---

### Task 1: Extend Types & Rename Pipeline Stages

**Files:**
- Modify: `src/pipeline/types.ts`

**What:** Add learning vocabulary types, challenge types to existing interfaces, and rename the last two pipeline stages from `asset_mapping`/`rpgmaker_adapter` to `phaser_asset_mapper`/`phaser_adapter`.

**Changes to `types.ts`:**

1. Add after `EmotionalBeat` interface:

```typescript
// ---- Learning Elements (extracted in Stage 2) ----

export interface VocabItem {
  id: string;
  term: string;           // Target language (e.g. Chinese characters)
  translation: string;    // Native language (e.g. English)
  pinyin?: string;        // Romanization (for Chinese/Japanese)
  context: string;        // Original context from source text
  difficulty: 1 | 2 | 3;
  distractors: string[];  // 3 wrong answers (in native language)
  segments?: string[];    // For sentence_order: ordered word segments
  segmentTranslations?: string[]; // Translations of each segment
}

export interface LearningElements {
  vocabulary: VocabItem[];
  targetLanguage: string;   // e.g. "Chinese"
  nativeLanguage: string;   // e.g. "English"
}
```

2. Add `learningElements` to `TextAnalysis`:

```typescript
export interface TextAnalysis {
  // ... existing fields ...
  learningElements?: LearningElements;
}
```

3. Add `challenge` field to `GameFlowNode`:

```typescript
export interface GameFlowNode {
  id: string;
  type: "anchor" | "decision" | "transition" | "ending" | "challenge";
  description: string;
  locationId: string;
  nextNodeIds: string[];
  challenge?: {
    type: "vocab_choice" | "fill_blank" | "sentence_order";
    vocabIds: string[];
    difficulty: 1 | 2 | 3;
  };
}
```

4. Add `challenge` to `SceneEvent`:

```typescript
export interface SceneEvent {
  // ... existing fields ...
  type: "npc_dialogue" | "transfer" | "autorun_cutscene" | "area_trigger" | "challenge_trigger";
  challenge?: {
    type: "vocab_choice" | "fill_blank" | "sentence_order";
    vocabIds: string[];
  };
}
```

5. Add new Phaser-specific output types:

```typescript
// ---- Phaser Asset Mapper Output (Stage 6) ----

export interface PhaserCharacterAsset {
  characterId: string;
  name: string;
  spriteColor: string; // hex color
}

export interface PhaserMapData {
  sceneId: string;
  name: string;
  width: number;
  height: number;
  ground: number[][];   // 0=grass,1=path,2=wall,3=water,4=floor,5=door
  collision: number[][]; // 0=walkable, 1=blocked
  playerSpawn: { x: number; y: number };
}

export interface PhaserAssetMapping {
  characters: PhaserCharacterAsset[];
  maps: PhaserMapData[];
}
```

6. Update `PipelineStage`:

```typescript
export type PipelineStage =
  | "section_splitting"
  | "text_analysis"
  | "game_design"
  | "scene_planning"
  | "scene_building"
  | "phaser_asset_mapper"
  | "phaser_adapter"
  | "complete"
  | "error";

export const PIPELINE_STAGES: PipelineStage[] = [
  "section_splitting",
  "text_analysis",
  "game_design",
  "scene_planning",
  "scene_building",
  "phaser_asset_mapper",
  "phaser_adapter",
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  section_splitting: "章节拆分",
  text_analysis: "文本分析",
  game_design: "游戏设计",
  scene_planning: "场景规划",
  scene_building: "场景构建",
  phaser_asset_mapper: "地图生成",
  phaser_adapter: "工程生成",
  complete: "完成",
  error: "出错",
};
```

**Commit:** `refactor: extend types with learning vocab, challenge nodes, rename stages to phaser`

---

### Task 2: Update Text Analyzer — Add Vocabulary Extraction

**Files:**
- Modify: `src/pipeline/text-analyzer.ts`

**What:** Extend the system prompt so the LLM also extracts vocabulary items with translations, pinyin, distractors, and sentence segments. The prompt must handle bilingual output (terms in target language, translations in native language).

**Append to the JSON schema in SYSTEM_PROMPT** (after `emotionalArc`):

```
  "learningElements": {
    "vocabulary": [
      {
        "id": "string - unique ID like 'v01'",
        "term": "string - word/phrase in TARGET language (the language being taught)",
        "translation": "string - meaning in NATIVE language (the reader's language)",
        "pinyin": "string - romanization/pronunciation guide (for Chinese: pinyin, for Japanese: romaji, etc.)",
        "context": "string - the sentence or situation where this word appears in the source text",
        "difficulty": 1 | 2 | 3,
        "distractors": ["string - 3 plausible but WRONG translations in the native language"],
        "segments": ["string array - ONLY for difficulty >= 2: the term split into ordered word segments for sentence ordering"],
        "segmentTranslations": ["string array - translation of each segment, same order as segments"]
      }
    ],
    "targetLanguage": "string - the language being taught (e.g. 'Chinese', 'Japanese', 'Spanish')",
    "nativeLanguage": "string - the reader's language (e.g. 'English')"
  }
```

**Add to the prompt instructions:**

```
Learning elements extraction rules:
- Extract 10-30 vocabulary items from the text, covering key words and phrases that a learner would benefit from.
- For the "term" field: use the TARGET language (the language being learned). These are the words the learner needs to study.
- For the "translation" field: use the NATIVE language. These explain what the term means.
- For "distractors": provide 3 plausible but WRONG translations in the native language. They should be semantically related (same category) to make the quiz challenging.
- For difficulty >= 2 items: also provide "segments" (the term broken into individual words) and "segmentTranslations" (translation of each word segment).
- Difficulty 1: single common words. Difficulty 2: short phrases (2-3 words). Difficulty 3: full sentences.
- Detect the target and native languages from the text content. If the text is a language textbook, the target language is the one being taught.
```

**Commit:** `feat: text analyzer extracts vocabulary with translations and distractors`

---

### Task 3: Update Game Designer — Add Challenge Nodes

**Files:**
- Modify: `src/pipeline/game-designer.ts`

**What:** Extend the system prompt so the LLM includes `"challenge"` type nodes in the game flow, referencing vocabulary IDs from the text analysis.

**Add to GameFlowNode type description in SYSTEM_PROMPT:**

```
A game flow node can now also be type "challenge" — a learning challenge tied to an NPC interaction:
{
  "id": "challenge_01",
  "type": "challenge",
  "description": "string - what the challenge tests",
  "locationId": "string - scene where challenge occurs",
  "nextNodeIds": ["string"],
  "challenge": {
    "type": "vocab_choice" | "fill_blank" | "sentence_order",
    "vocabIds": ["string - IDs from the vocabulary in text analysis"],
    "difficulty": 1 | 2 | 3
  }
}

Rules for challenge nodes:
- Include 2-5 challenge nodes spread across the game flow.
- Each challenge should reference 2-4 vocabulary IDs from the text analysis.
- Mix challenge types: use vocab_choice for difficulty 1, fill_blank for difficulty 1-2, sentence_order for difficulty 2-3.
- Place challenges AFTER anchor events where the player has just learned new content through NPC dialogue.
- Challenge nodes should be interleaved with story progression, not bunched together.
```

**Also update the user prompt** to include the vocabulary list from text analysis, so the LLM can reference vocab IDs:

In `designGame()`, when building the user prompt, append the vocabulary:
```typescript
const analysisWithVocab = {
  ...analysis,
  availableVocabulary: analysis.learningElements?.vocabulary?.map(v => ({
    id: v.id, term: v.term, translation: v.translation, difficulty: v.difficulty
  })) ?? []
};
```

**Commit:** `feat: game designer adds challenge nodes referencing vocabulary`

---

### Task 4: Update Scene Planner — Phaser Size Adjustments

**Files:**
- Modify: `src/pipeline/scene-planner.ts`

**What:** Minor prompt update — change "RPG Maker MZ" references to "Phaser" and adjust map size dimensions to match the Phaser template conventions.

**Updates:**
1. Replace "RPG Maker MZ" with "Phaser" in prompt text.
2. Update size dimensions in prompt:
   - small: 15x12
   - medium: 20x15
   - large: 25x18
3. No logic changes needed — just prompt text.

**Commit:** `chore: scene planner prompt targets Phaser sizes`

---

### Task 5: Update Scene Builder — Challenge Events

**Files:**
- Modify: `src/pipeline/scene-builder.ts`

**What:** Update the prompt so the LLM generates `challenge` fields on NPC dialogue events when the NPC is associated with a learning challenge. Remove RPG Maker-specific fields from the prompt (changeActorImage, controlTransferTarget, addToParty, switches).

**Key changes to `buildSystemPrompt()`:**

1. Replace "RPG Maker MZ" → "Phaser" in all prompt text.
2. Remove switch/condition mechanics (setSwitchId, setSwitchValue, conditions).
3. Remove changeActorImage, controlTransferTarget, addToParty.
4. Add challenge_trigger event type:

```
- "challenge_trigger": An NPC that triggers a learning challenge after dialogue. Same as npc_dialogue but includes a "challenge" field:
  {
    "challenge": {
      "type": "vocab_choice" | "fill_blank" | "sentence_order",
      "vocabIds": ["v01", "v02", "v03"]
    }
  }
  The challenge is presented AFTER the dialogue lines finish.
```

5. Pass vocabulary + challenge info from game_design into the scene builder context so the LLM knows which NPCs have challenges:

In `buildScenes()`, add challenge info to context:
```typescript
const relevantChallenges = design.gameFlow
  .filter(n => n.type === "challenge" && (
    n.locationId === scene.id || findLocationScene(n.locationId, plan) === scene.id
  ))
  .map(n => n.challenge);
```

**Commit:** `feat: scene builder generates challenge events, removes RPG Maker specifics`

---

### Task 6: Write Phaser Asset Mapper (NEW)

**Files:**
- Create: `src/pipeline/phaser-asset-mapper.ts`
- Delete (replace): `src/pipeline/asset-mapper.ts`

**What:** Deterministic module (NO LLM call) that generates:
1. Character sprite colors — assign distinct hex colors from a palette.
2. Map tile data — procedurally generate `ground[][]` and `collision[][]` arrays based on scene metadata.

**Map generation algorithm:**

```
OUTDOOR scene:
  1. Fill grid with grass (0)
  2. Draw horizontal main path (1) through center ±1 row
  3. Add vertical branch paths to NPC positions
  4. Place building outlines (wall=2) in corners
  5. Optional: add water (3) area if atmosphere mentions water/river
  6. collision: wall→1, water→1, else→0

INDOOR scene:
  1. Fill border row/col with wall (2)
  2. Fill interior with floor (4)
  3. Place door (5) at transfer exit positions on border
  4. collision: wall→1, door→0, floor→0
```

**Size mappings:**
```typescript
const SCENE_SIZES: Record<string, { w: number; h: number }> = {
  small: { w: 15, h: 12 },
  medium: { w: 20, h: 15 },
  large: { w: 25, h: 18 },
};
```

**Color palette for characters:**
```typescript
const CHARACTER_COLORS = [
  "#e6a23c", "#f56c6c", "#67c23a", "#409eff",
  "#9b59b6", "#e67e22", "#1abc9c", "#e74c3c",
  "#3498db", "#2ecc71", "#f39c12", "#8e44ad",
];
```

**Function signature:**
```typescript
export function mapPhaserAssets(
  analysis: TextAnalysis,
  plan: ScenePlan,
  sceneDetails: SceneDetail[],
): PhaserAssetMapping
```

Note: This function is synchronous and deterministic. No LLM call, no `ctx` parameter.

**Commit:** `feat: add phaser-asset-mapper with procedural map generation`

---

### Task 7: Write Phaser Adapter (NEW)

**Files:**
- Create: `src/pipeline/phaser-adapter.ts`
- Delete (replace): `src/pipeline/rpgmaker-adapter.ts`

**What:** Deterministic module that:
1. Creates output directory: `generated/<project-id>/`
2. Copies the Phaser template (`src/phaser/template/index.html` + `src/phaser/template/src/`) to output.
3. Generates and writes the 4 data JSON files.

**Data transformation:**

```typescript
// config.json
{
  title: project.name,
  subtitle: `Learn ${targetLanguage} through exploration`,
  targetLanguage: analysis.learningElements?.targetLanguage ?? "Chinese",
  nativeLanguage: analysis.learningElements?.nativeLanguage ?? "English",
  tileSize: 32,
  playerSprite: "player"
}

// maps.json — from PhaserAssetMapping.maps
{ maps: assetMapping.maps }

// events.json — transform SceneDetail[] → Phaser format
{
  scenes: sceneDetails.map(sd => ({
    sceneId: sd.sceneId,
    npcs: sd.events
      .filter(e => e.type === "npc_dialogue" || e.type === "challenge_trigger")
      .map(e => ({
        id: e.id,
        name: findCharacterName(e.characterId, analysis),
        x: e.x,
        y: e.y,
        spriteColor: findCharacterColor(e.characterId, assetMapping),
        dialogue: e.dialogue?.lines.map(l => ({
          speaker: findCharacterName(l.speakerCharacterId, analysis),
          text: l.text
        })) ?? [],
        challenge: e.challenge ?? null
      })),
    transfers: sd.events
      .filter(e => e.type === "transfer")
      .map(e => ({
        id: e.id,
        x: e.x,
        y: e.y,
        width: 1,
        height: 1,
        targetScene: e.transfer!.targetSceneId,
        targetX: e.transfer!.targetX,
        targetY: e.transfer!.targetY
      }))
  }))
}

// vocabulary.json — from TextAnalysis.learningElements
{
  vocabulary: analysis.learningElements?.vocabulary ?? []
}
```

**Template copy logic:**
```typescript
import * as fs from "fs";
import * as path from "path";

function copyDirSync(src: string, dest: string) {
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
```

**Function signature:**
```typescript
export interface PhaserAdapterInput {
  projectId: string;
  projectName: string;
  textAnalysis: TextAnalysis;
  gameDesign: GameDesign;
  scenePlan: ScenePlan;
  sceneDetails: SceneDetail[];
  assetMapping: PhaserAssetMapping;
}

export async function adaptToPhaser(input: PhaserAdapterInput): Promise<string>
// Returns: output directory path
```

**Commit:** `feat: add phaser-adapter to generate game data JSONs and copy template`

---

### Task 8: Rewire Orchestrator

**Files:**
- Modify: `src/pipeline/orchestrator.ts`

**What:** Replace all `asset_mapping`/`rpgmaker_adapter` references with `phaser_asset_mapper`/`phaser_adapter`. Update imports, function calls, and stage flow logic.

**Key changes:**

1. Replace imports:
   - `import { mapAssets } from "@/pipeline/asset-mapper"` → `import { mapPhaserAssets } from "@/pipeline/phaser-asset-mapper"`
   - `import { adaptToRPGMaker } from "@/pipeline/rpgmaker-adapter"` → `import { adaptToPhaser } from "@/pipeline/phaser-adapter"`
   - Update type imports: `AssetMapping` → `PhaserAssetMapping`

2. In `nextStageArticle()` / `nextStageBook()`:
   - `"asset_mapping"` → `"phaser_asset_mapper"`
   - `"rpgmaker_adapter"` → `"phaser_adapter"`

3. In `runStep()` switch cases:
   - `case "asset_mapping"` → `case "phaser_asset_mapper"`: Now calls `mapPhaserAssets()` (synchronous, no streaming). Also needs `sceneDetails` as input (since map generation uses NPC positions).
   - `case "rpgmaker_adapter"` → `case "phaser_adapter"`: Calls `adaptToPhaser()` with the new input interface.

4. Update `STAGE_DEPS` and `STAGE_LABELS` maps.

5. In `getBookStageOrder()`: update stage names.

6. In `syncStep()`: update stage references. Note: `phaser_asset_mapper` and `phaser_adapter` are deterministic — just re-run them on sync.

**Commit:** `refactor: orchestrator uses phaser stages instead of rpgmaker`

---

### Task 9: Update DB Constants & Prompts

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `src/pipeline/prompts.ts`

**Changes to `db.ts`:**
```typescript
const STAGE_ORDER: PipelineStage[] = [
  "section_splitting",
  "text_analysis",
  "game_design",
  "scene_planning",
  "scene_building",
  "phaser_asset_mapper",
  "phaser_adapter",
];
```

**Changes to `prompts.ts`:**
- Rename `phaser_adapter` key (was `rpgmaker_adapter`)
- Rename `asset_mapping` → `phaser_asset_mapper`
- Update SCENE_BUILDING_PROMPT description

**Commit:** `chore: update db stage order and prompt keys for phaser`

---

### Task 10: Update UI Stage Labels

**Files:**
- Modify: `src/components/StepStepper.tsx`
- Modify: `src/components/StepResultViewer.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/projects/[id]/page.tsx`

**What:** Rename all `asset_mapping` → `phaser_asset_mapper` and `rpgmaker_adapter` → `phaser_adapter` in UI stage definitions and labels.

**StepStepper.tsx:**
```typescript
const ARTICLE_STAGES: StageInfo[] = [
  { key: "text_analysis", label: "文本分析" },
  { key: "game_design", label: "游戏设计" },
  { key: "scene_planning", label: "场景规划" },
  { key: "scene_building", label: "场景构建" },
  { key: "phaser_asset_mapper", label: "地图生成" },
  { key: "phaser_adapter", label: "工程生成" },
];
```

In `buildBookStages()`, update the final two stages similarly.

**page.tsx** (home): Update STAGE_LABELS map.

**projects/[id]/page.tsx**: Update `adapterStage` to `"phaser_adapter"` and stage definitions.

**StepResultViewer.tsx**: Update any stage-specific rendering logic.

**Commit:** `chore: update UI labels for phaser pipeline stages`

---

### Task 11: End-to-End Verification

**Steps:**

1. Start dev server: `npm run dev`
2. Create a new project in the UI with a short Chinese language learning text (paste ~500 chars of a textbook excerpt).
3. Run each pipeline stage sequentially through the UI.
4. Verify each stage output:
   - text_analysis: should include `learningElements` with vocabulary items
   - game_design: should include challenge nodes in gameFlow
   - scene_building: should include challenge fields on NPC events
   - phaser_asset_mapper: should produce maps with tile arrays and character colors
   - phaser_adapter: should create `generated/<project-id>/` directory with all files
5. Serve the generated game: `npx serve generated/<project-id>/`
6. Verify the game loads, player moves, NPC dialogue works, challenges trigger.

**Sample test input (short Chinese learning text):**
```
第一课：打招呼

小明是一个学生。他每天早上去学校。

"你好！"小明对老师说。
"你好，小明！早上好！"老师回答。
"谢谢老师。"
"不客气。今天我们学习新的词语。"

老师在黑板上写了几个字：朋友、家人、学校。

"谁能告诉我，'朋友'是什么意思？"老师问。
"朋友就是 friend！"小红说。
"很好！那'家人'呢？"
"家人是 family。"小明回答。

下课后，小明和小红一起回家。
"再见！明天见！"
"再见！"
```

**Commit:** N/A (verification only)

---

## Summary of file changes

| Action | File | Task |
|--------|------|------|
| Modify | `src/pipeline/types.ts` | 1 |
| Modify | `src/pipeline/text-analyzer.ts` | 2 |
| Modify | `src/pipeline/game-designer.ts` | 3 |
| Modify | `src/pipeline/scene-planner.ts` | 4 |
| Modify | `src/pipeline/scene-builder.ts` | 5 |
| Create | `src/pipeline/phaser-asset-mapper.ts` | 6 |
| Create | `src/pipeline/phaser-adapter.ts` | 7 |
| Modify | `src/pipeline/orchestrator.ts` | 8 |
| Modify | `src/lib/db.ts` | 9 |
| Modify | `src/pipeline/prompts.ts` | 9 |
| Modify | `src/components/StepStepper.tsx` | 10 |
| Modify | `src/components/StepResultViewer.tsx` | 10 |
| Modify | `src/app/page.tsx` | 10 |
| Modify | `src/app/projects/[id]/page.tsx` | 10 |
| Delete | `src/pipeline/asset-mapper.ts` | 6 (replaced) |
| Delete | `src/pipeline/rpgmaker-adapter.ts` | 7 (replaced) |
