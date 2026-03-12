# RPG Game Learn Quest

Turn any text into a playable browser RPG — automatically.

Paste an article, story, or book chapter, and the AI pipeline extracts characters, plot points, and locations, then generates a fully playable tile-based RPG you can explore in the browser. No game dev skills required.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    ANY TEXT INPUT                            │
│            (article / story / book chapter)                  │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI PIPELINE (7 stages)                     │
│                                                             │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐             │
│  │ 1. Split  │──▶│ 2. Text   │──▶│ 3. Game   │             │
│  │ Sections  │   │ Analysis  │   │ Design    │             │
│  └───────────┘   └───────────┘   └───────────┘             │
│       LLM             LLM             LLM                   │
│  (split long     (characters /   (anchor events /           │
│   text into       plot / theme    decision nodes)            │
│   chapters)       extraction)                               │
│                                       │                     │
│                                       ▼                     │
│  ┌───────────┐   ┌───────────┐   ┌───────────┐             │
│  │ 4. Scene  │──▶│ 5. Scene  │──▶│ 6. Asset  │             │
│  │ Planning  │   │ Building  │   │ Mapper    │             │
│  └───────────┘   └───────────┘   └───────────┘             │
│       LLM             LLM          No LLM                   │
│  (3-8 map scenes) (NPC dialogue / (procedural map           │
│                    event scripts)  generation /              │
│                                    color assignment)         │
│                                       │                     │
│                                       ▼                     │
│                              ┌───────────────┐              │
│                              │ 7. Phaser     │              │
│                              │ Adapter       │              │
│                              └───────────────┘              │
│                                No LLM                       │
│                          (assemble JSON +                    │
│                           copy template)                     │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  GENERATED OUTPUT                            │
│                                                             │
│   generated/<project-id>/                                   │
│   ├── index.html              ← Phaser 3 entry point        │
│   ├── src/                                                  │
│   │   ├── main.js             ← game config                 │
│   │   ├── scenes/                                           │
│   │   │   ├── BootScene.js    ← load data + gen textures    │
│   │   │   ├── TitleScene.js   ← title screen                │
│   │   │   ├── MapScene.js     ← map exploration + NPC       │
│   │   │   └── DialogueScene.js← dialogue system             │
│   │   └── systems/                                          │
│   │       └── ProgressTracker.js                            │
│   └── data/                   ← AI-generated data           │
│       ├── config.json         ← title / settings            │
│       ├── maps.json           ← tile maps (ground+collide)  │
│       ├── events.json         ← NPC dialogue + transfers    │
│       └── vocabulary.json     ← (reserved for future)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                  PLAYABLE RPG IN BROWSER                     │
│                                                             │
│   ┌─────────────────────────────────────────────┐           │
│   │  ┌──────┬──────┬──────┬──────┐              │           │
│   │  │ wall │ wall │ door │ wall │  ← tile map   │           │
│   │  ├──────┼──────┼──────┼──────┤              │           │
│   │  │floor │  R   │floor │  G   │  ← NPC        │           │
│   │  │      │NPC A │      │NPC B │              │           │
│   │  ├──────┼──────┼──────┼──────┤              │           │
│   │  │floor │floor │  B   │floor │  ← player     │           │
│   │  │      │      │player│      │              │           │
│   │  └──────┴──────┴──────┴──────┘              │           │
│   │                                             │           │
│   │  ┌─────────────────────────────────────┐    │           │
│   │  │ Minister:                           │    │           │
│   │  │ Your Majesty, the fabric is truly   │    │           │
│   │  │ magnificent!                    ▼   │    │           │
│   │  └─────────────────────────────────────┘    │           │
│   └─────────────────────────────────────────────┘           │
│                                                             │
│   Controls:                                                 │
│   • Arrow keys — move                                       │
│   • Enter / Space — talk to NPC                             │
│   • Scene transfers via doors                               │
│   • Progress saved to localStorage                          │
└─────────────────────────────────────────────────────────────┘
```

**Core idea**: Fixed Phaser game template + AI-generated data JSON = any text becomes a playable RPG.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, React, Tailwind CSS |
| AI Pipeline | TypeScript, OpenAI-compatible LLM API |
| Game Engine | Phaser 3 (v3.80.1, loaded via CDN) |
| Database | SQLite (better-sqlite3) for project state |
| Input Formats | Plain text, PDF, EPUB |

## Project Structure

```
src/
├── app/                    # Next.js pages & API routes
├── components/             # React UI components
├── lib/                    # Database, utilities
├── llm/                    # LLM client wrapper
├── pipeline/               # 7-stage generation pipeline
│   ├── section-splitter.ts #   1. Split long text into sections
│   ├── text-analyzer.ts    #   2. Extract characters, plot, themes
│   ├── game-designer.ts    #   3. Design anchor events & decisions
│   ├── scene-planner.ts    #   4. Plan 3-8 map scenes
│   ├── scene-builder.ts    #   5. Build NPC dialogue & events
│   ├── phaser-asset-mapper.ts # 6. Procedural maps & colors (no LLM)
│   ├── phaser-adapter.ts   #   7. Assemble output (no LLM)
│   ├── orchestrator.ts     #   Pipeline orchestration
│   └── types.ts            #   Shared type definitions
└── phaser/
    └── template/           # Phaser game template (copied per project)
        ├── index.html
        └── src/scenes/     # BootScene, TitleScene, MapScene, DialogueScene
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (or npm)
- An OpenAI-compatible API key

### Install & Run

```bash
git clone https://github.com/Zihanmmm/rpggame-learn-quest.git
cd rpggame-learn-quest
pnpm install

# Set your LLM API key
cp .env.example .env.local
# Edit .env.local with your API key

pnpm dev
```

Open `http://localhost:3000`, paste any text, and watch it become an RPG.

### Serve a Generated Game

Generated games are static files — serve with any HTTP server:

```bash
npx serve generated/<project-id> -p 8080
```

## Architecture

The system follows a **data-driven architecture**:

1. **Phaser template** is a fixed game engine that reads `data/*.json` at runtime
2. **AI pipeline** (stages 1-5) uses LLM calls to understand the text and script game events
3. **Deterministic stages** (6-7) generate tile maps procedurally and assemble the final output — no LLM needed
4. The generated game is **fully static** — no server required to play

This means the game template never changes per project. All the story-specific content lives in the 4 JSON data files.

## License

MIT
