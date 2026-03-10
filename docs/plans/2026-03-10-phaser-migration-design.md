# Phaser Migration & Language Learning Game Design

## Goal

Replace RPG Maker MZ with Phaser.io as the game engine. Build an open-source tool that takes a learning book (language or other subject) and auto-generates an interactive RPG-style game playable in the browser.

## Architecture

### Two-Layer System

1. **Tool** (Next.js + AI Pipeline) — the game-making agent. Unchanged.
2. **Output** (Phaser game) — the playable product. Replaces RMMZ.

```
User uploads learning material
     ↓
┌──────────────── Next.js Tool ────────────────┐
│  Stage 1: Section Splitter  (unchanged)      │
│  Stage 2: Text Analyzer     (add learning)   │
│  Stage 3: Game Designer     (add challenges) │
│  Stage 4: Scene Planner     (minor changes)  │
│  Stage 5: Scene Builder     (add challenges) │
│  Stage 6: Phaser Asset Mapper (rewrite)      │
│  Stage 7: Phaser Adapter      (rewrite)      │
└──────────────────────────────────────────────┘
     ↓
generated/project-xxx/    ← static site, serve anywhere
```

### Why Phaser

| Criteria | RPG Maker MZ | Phaser |
|----------|-------------|--------|
| License | Proprietary ($80 + asset restrictions) | MIT, fully free |
| Tech stack | Separate runtime, custom JSON format | TypeScript/JS, same as tool |
| Assets | Requires paid asset pack | Kenney.nl CC0 free packs |
| Customization | Limited to plugin system | Full code control |
| Output | Needs RMMZ runtime files | Self-contained static site |
| Open source friendly | No (proprietary assets) | Yes |

### Why Not Unity/Godot

- **Unity**: Closed source, C# (different stack), web builds 10-20MB+, users need Unity installed to customize.
- **Godot**: Good option for future. GDScript is a different stack. Could add as optional exporter later.
- **Phaser**: Same JS/TS stack, embeds in web, npm install, zero extra tooling.

## Engine Choice: Phaser

- Data-driven architecture: Phaser game code is a **fixed template**, reused by every project.
- AI pipeline only generates `data/*.json` files, not game code.
- Users can manually edit JSON to tweak game content.

## Game Mechanics

### Player Controls

Same as current RPG: arrow keys to move, Enter to interact/advance dialogue, Esc for menu.

### Core Game Loop

```
Explore map → Talk to NPC → Learning challenge triggered → Answer → Story progresses
```

### Learning Challenge Types

**Phase 1 (MVP):**

1. **Vocab Choice** — NPC speaks in target language, player picks correct translation from 4 options.
2. **Fill in the Blank** — A word in the dialogue is hidden `___`, player selects the correct word.
3. **Sentence Ordering** — Scrambled sentence fragments, player arranges in correct order.

**Future:**

4. **Free Translation** — Player types a translation.
5. **Listening** — Audio plays, player selects matching text.

### Answer Consequences

- **Correct**: Positive NPC feedback, story continues, XP gained.
- **Wrong**: Hint + correct answer shown, can retry, reduced XP.
- **No game-over** — player always progresses. Accuracy affects final score.

### Progress System

- Each scene has a vocabulary list to master.
- Enter scene → introduce new words → reinforce in dialogue → test before exit.
- Missed words auto-added to review queue.

## Pipeline Changes

### Stage 2: Text Analyzer (Modified)

Add learning element extraction alongside existing narrative analysis:

```typescript
interface TextAnalysis {
  // Existing fields preserved: characters, locations, timeline, emotionalArc

  learningElements: {
    vocabulary: VocabItem[];
    concepts: ConceptItem[];       // For general subject extension
    dialogueExamples: Example[];
  };
}

interface VocabItem {
  id: string;
  term: string;           // Target language
  translation: string;    // Native language
  context: string;        // Original context from source text
  difficulty: 1 | 2 | 3;
}

interface ConceptItem {
  id: string;
  concept: string;
  explanation: string;
  relatedVocab: string[];
}
```

### Stage 3: Game Designer (Modified)

Add challenge nodes to game flow:

```typescript
interface GameFlowNode {
  // Existing fields preserved
  type: "anchor" | "decision" | "transition" | "ending"
      | "challenge";   // NEW

  challenge?: {
    type: "vocab_choice" | "fill_blank" | "sentence_order";
    vocabIds: string[];
    difficulty: 1 | 2 | 3;
  };
}
```

### Stage 4: Scene Planner (Minor Changes)

Scenes now represent learning units. Each scene associated with a vocabulary subset.

### Stage 5: Scene Builder (Modified)

NPC dialogue interleaves learning events:

```typescript
interface SceneEvent {
  // Existing fields preserved
  type: "npc_dialogue" | "transfer" | "autorun_cutscene"
      | "area_trigger" | "challenge_trigger";   // NEW

  challenge?: ChallengeEvent;
}
```

### Stage 6: Phaser Asset Mapper (Rewrite)

Map characters and scenes to Kenney asset pack sprites and tilesets instead of RMMZ assets.

### Stage 7: Phaser Adapter (Rewrite)

Generate `data/*.json` files and copy Phaser game template. No code generation — data only.

## Generated Game Structure

```
generated/project-xxx/
├── index.html
├── src/
│   ├── main.js                 ← Phaser config + boot
│   ├── scenes/
│   │   ├── BootScene.js        ← Asset loading
│   │   ├── TitleScene.js       ← Title screen
│   │   ├── MapScene.js         ← Generic map (reused per scene)
│   │   ├── DialogueScene.js    ← Dialogue UI overlay
│   │   └── ChallengeScene.js   ← Learning challenge UI overlay
│   ├── systems/
│   │   ├── PlayerController.js ← Arrow key movement
│   │   ├── DialogueManager.js  ← Dialogue box logic
│   │   ├── ChallengeManager.js ← Quiz/scoring logic
│   │   └── ProgressTracker.js  ← localStorage progress
│   └── utils/
│       └── TilemapLoader.js
├── data/
│   ├── maps.json               ← All map tilemap data
│   ├── events.json             ← NPC positions, dialogues, challenges
│   ├── vocabulary.json         ← Full vocabulary list
│   └── config.json             ← Game title, language pair, settings
└── assets/
    ├── tilesets/               ← Kenney CC0 tiles
    ├── characters/             ← Character spritesheets
    ├── ui/                     ← Dialogue boxes, buttons
    └── audio/                  ← Optional BGM/SE
```

Key: `src/` is a fixed template copied to every project. `data/` is generated per project by the AI pipeline.

## Free Assets

| Type | Source | License |
|------|--------|---------|
| Tilesets | Kenney.nl (Tiny Town, RPG Urban, etc.) | CC0 |
| Characters | Kenney Tiny Characters | CC0 |
| UI | Kenney UI Pack | CC0 |
| Audio | Kenney (optional) | CC0 |
| Fonts | Google Fonts / M+ | OFL |

## Implementation Phases

### Phase 1 — Phaser Game Template (MVP)

Write the fixed Phaser game engine that loads from `data/*.json`:

- [ ] Set up Phaser project with Kenney assets
- [ ] BootScene: asset loading
- [ ] TitleScene: title + "New Game"
- [ ] MapScene: tilemap rendering, player movement (arrow keys), NPC collision
- [ ] DialogueScene: text box overlay, line-by-line advance (Enter key)
- [ ] ChallengeScene: vocab choice UI, fill-in-blank UI, sentence ordering UI
- [ ] PlayerController: 4-direction grid movement
- [ ] ProgressTracker: localStorage save/load
- [ ] Hand-write sample `data/*.json` to validate the template works
- [ ] Verify end-to-end: static site serves and plays correctly

### Phase 2 — Pipeline Integration

Connect the AI pipeline to generate Phaser-compatible data:

- [ ] Modify Stage 2 prompts: extract vocabulary + learning elements
- [ ] Modify Stage 3 prompts: insert challenge nodes in game flow
- [ ] Modify Stage 5 prompts: generate challenge events in scene data
- [ ] Write Stage 6: `phaser_asset_mapper` (map to Kenney assets)
- [ ] Write Stage 7: `phaser_adapter` (generate data JSONs + copy template)
- [ ] Update orchestrator for new stage 6/7
- [ ] End-to-end test: upload book → generate → play

### Phase 3 — Polish

- [ ] Progress system with spaced repetition review queue
- [ ] Multi-language support (configurable target/native language pair)
- [ ] Score/accuracy display per scene and overall
- [ ] Review mode: replay missed vocabulary
- [ ] Better tilemap generation (varied layouts per scene type)

## Future TODOs

### General Subject Learning Extension

- Generalize `VocabItem` → `LearningItem` (supports facts, formulas, concepts)
- New challenge types: true/false, matching, concept explanation
- Subject templates: history (timeline game), science (experiment sim), math (puzzle levels)

### Richer Game Modes (Option C from design)

- Hybrid mode: dialogue sequences interspersed with Phaser mini-games
- More challenge types: drag-and-drop, timed challenges, multiplayer quiz

### Alternative Exporters

- Godot exporter: generate .tscn scene files for users who want native app export
- Mobile wrapper: Capacitor/Cordova for iOS/Android packaging

## Migration Path from Current Codebase

### Files to Keep

- `src/pipeline/section-splitter.ts` — unchanged
- `src/pipeline/text-analyzer.ts` — modify prompts, add learningElements
- `src/pipeline/game-designer.ts` — modify prompts, add challenge nodes
- `src/pipeline/scene-planner.ts` — minor prompt changes
- `src/pipeline/scene-builder.ts` — modify prompts, add challenge events
- `src/pipeline/orchestrator.ts` — update stage 6/7 references
- `src/pipeline/types.ts` — extend interfaces
- `src/pipeline/prompts.ts` — update stage descriptions
- `src/llm/client.ts` — unchanged
- `src/lib/db.ts` — unchanged
- `src/app/` — all UI pages unchanged (project list, new project, pipeline viewer)

### Files to Replace

- `src/pipeline/asset-mapper.ts` → `src/pipeline/phaser-asset-mapper.ts`
- `src/pipeline/rpgmaker-adapter.ts` → `src/pipeline/phaser-adapter.ts`
- `src/rpgmaker/*` → `src/phaser/*` (new game template + builder)

### Files to Add

- `src/phaser/template/` — the fixed Phaser game engine (copied to output)
- `src/phaser/data-builder.ts` — generates maps.json, events.json, vocabulary.json
- `src/phaser/assets/` — bundled Kenney CC0 assets

### Files to Remove (eventually)

- `src/rpgmaker/*` — after Phaser is stable, remove RMMZ code
- `template/` — RMMZ template directory
