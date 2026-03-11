# Phase 1: Phaser Game Template Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a self-contained Phaser 3 game template that loads map, event, and vocabulary data from JSON files, rendering a playable RPG with learning challenges — no build step required.

**Architecture:** The template is a static site using ES modules + Phaser from CDN. All game scenes are vanilla JS. Data is loaded from `data/*.json`. The template lives in `src/phaser/template/` and gets copied verbatim to `generated/project-xxx/` by the pipeline adapter (Phase 2). Procedurally generated placeholder sprites keep the template self-contained with zero external asset downloads for MVP.

**Tech Stack:** Phaser 3 (CDN ESM), vanilla JS (ES modules), no bundler, static site.

**Testing:** This is a browser game — no unit test runner. Each task is verified by serving the static site and visually confirming behavior. Use `npx serve src/phaser/template` to test.

---

## File Structure

```
src/phaser/template/
├── index.html
├── src/
│   ├── main.js
│   ├── scenes/
│   │   ├── BootScene.js
│   │   ├── TitleScene.js
│   │   ├── MapScene.js
│   │   ├── DialogueScene.js
│   │   └── ChallengeScene.js
│   └── systems/
│       └── ProgressTracker.js
├── data/
│   ├── config.json
│   ├── maps.json
│   ├── events.json
│   └── vocabulary.json
```

---

## Task 1: Project Setup + index.html + main.js

**Files:**
- Create: `src/phaser/template/index.html`
- Create: `src/phaser/template/src/main.js`

**Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Learn Quest</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a2e; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    #game-container { border-radius: 4px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.5); }
  </style>
</head>
<body>
  <div id="game-container"></div>
  <script src="https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js"></script>
  <script type="module" src="src/main.js"></script>
</body>
</html>
```

Note: We use the UMD build (not ESM) of Phaser so `Phaser` is a global. Our game code uses ES modules for internal imports.

**Step 2: Create main.js**

```js
import { BootScene } from './scenes/BootScene.js';
import { TitleScene } from './scenes/TitleScene.js';
import { MapScene } from './scenes/MapScene.js';
import { DialogueScene } from './scenes/DialogueScene.js';
import { ChallengeScene } from './scenes/ChallengeScene.js';

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'game-container',
  pixelArt: true,
  backgroundColor: '#1a1a2e',
  scene: [BootScene, TitleScene, MapScene, DialogueScene, ChallengeScene],
  physics: {
    default: 'arcade',
    arcade: { debug: false }
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  }
};

new Phaser.Game(config);
```

**Step 3: Create stub scenes so the game boots without errors**

Create minimal stubs for all 5 scenes (just `constructor` + empty `create`). We'll fill them in subsequent tasks.

`src/phaser/template/src/scenes/BootScene.js`:
```js
export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  preload() {}
  create() { this.scene.start('TitleScene'); }
}
```

`src/phaser/template/src/scenes/TitleScene.js`:
```js
export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }
  create() {
    this.add.text(400, 300, 'Title Scene Stub', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
  }
}
```

`src/phaser/template/src/scenes/MapScene.js`:
```js
export class MapScene extends Phaser.Scene {
  constructor() { super('MapScene'); }
  create() {}
}
```

`src/phaser/template/src/scenes/DialogueScene.js`:
```js
export class DialogueScene extends Phaser.Scene {
  constructor() { super('DialogueScene'); }
  create() {}
}
```

`src/phaser/template/src/scenes/ChallengeScene.js`:
```js
export class ChallengeScene extends Phaser.Scene {
  constructor() { super('ChallengeScene'); }
  create() {}
}
```

**Step 4: Verify**

Run: `cd src/phaser/template && npx serve .`
Open browser → should see dark background with "Title Scene Stub" text centered.

**Step 5: Commit**

```bash
git add src/phaser/template/
git commit -m "feat: scaffold Phaser template with stub scenes"
```

---

## Task 2: Sample Data Files

**Files:**
- Create: `src/phaser/template/data/config.json`
- Create: `src/phaser/template/data/maps.json`
- Create: `src/phaser/template/data/events.json`
- Create: `src/phaser/template/data/vocabulary.json`

These are hand-written sample data for a 2-scene demo: a village square and a classroom. Player starts in village, talks to a guide NPC, walks east into classroom, talks to a teacher NPC who triggers a vocab challenge.

**Step 1: config.json**

```json
{
  "title": "Chinese Village Adventure",
  "subtitle": "Learn basic Chinese through exploration",
  "targetLanguage": "Chinese",
  "nativeLanguage": "English",
  "tileSize": 32,
  "playerSprite": "player"
}
```

**Step 2: maps.json**

Tile legend: 0=grass, 1=path, 2=wall, 3=water, 4=floor, 5=door

```json
{
  "maps": [
    {
      "id": "village",
      "name": "Village Square",
      "width": 20,
      "height": 15,
      "layers": {
        "ground": [
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,2,2,2,2,2,0,0,0,0,0,0,2,2,2,2,2,0,0],
          [0,0,2,4,4,4,2,0,0,0,0,0,0,2,4,4,4,2,0,0],
          [0,0,2,4,4,4,2,0,0,0,0,0,0,2,4,4,4,5,0,0],
          [0,0,2,4,4,4,5,0,0,1,1,0,0,2,2,2,2,2,0,0],
          [0,0,2,2,2,2,2,0,0,1,1,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0],
          [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
          [0,0,0,0,0,0,0,0,1,1,1,1,0,0,0,0,0,0,0,0],
          [0,0,0,3,3,3,0,0,0,1,1,0,0,0,0,0,0,0,0,0],
          [0,0,3,3,3,3,3,0,0,1,1,0,0,0,0,0,0,0,0,0],
          [0,0,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        ],
        "collision": [
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,1,1,1,1,1,0,0,0,0,0,0,1,1,1,1,1,0,0],
          [0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,1,0,0],
          [0,0,1,0,0,0,1,0,0,0,0,0,0,1,0,0,0,0,0,0],
          [0,0,1,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,0,0],
          [0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
          [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
        ]
      },
      "playerSpawn": { "x": 9, "y": 9 }
    },
    {
      "id": "classroom",
      "name": "Classroom",
      "width": 12,
      "height": 10,
      "layers": {
        "ground": [
          [2,2,2,2,2,2,2,2,2,2,2,2],
          [2,4,4,4,4,4,4,4,4,4,4,2],
          [2,4,4,4,4,4,4,4,4,4,4,2],
          [2,4,4,4,4,4,4,4,4,4,4,2],
          [2,4,4,4,4,4,4,4,4,4,4,2],
          [2,4,4,4,4,4,4,4,4,4,4,2],
          [2,4,4,4,4,4,4,4,4,4,4,2],
          [2,4,4,4,4,4,4,4,4,4,4,2],
          [2,4,4,4,4,4,4,4,4,4,4,2],
          [2,2,2,2,2,5,5,2,2,2,2,2]
        ],
        "collision": [
          [1,1,1,1,1,1,1,1,1,1,1,1],
          [1,0,0,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,0,0,0,0,1],
          [1,0,0,0,0,0,0,0,0,0,0,1],
          [1,1,1,1,1,0,0,1,1,1,1,1]
        ]
      },
      "playerSpawn": { "x": 5, "y": 8 }
    }
  ]
}
```

**Step 3: events.json**

```json
{
  "scenes": [
    {
      "sceneId": "village",
      "npcs": [
        {
          "id": "guide",
          "name": "Li Wei",
          "x": 10,
          "y": 7,
          "spriteColor": "#e6a23c",
          "dialogue": [
            { "speaker": "Li Wei", "text": "你好！欢迎来到我们的村庄！" },
            { "speaker": "Li Wei", "text": "Welcome to our village!" },
            { "speaker": "Li Wei", "text": "Head east to the classroom to start learning." },
            { "speaker": "Li Wei", "text": "往东走到教室去学习吧！" }
          ],
          "challenge": null
        }
      ],
      "transfers": [
        {
          "id": "to_classroom",
          "x": 17,
          "y": 4,
          "width": 1,
          "height": 1,
          "targetScene": "classroom",
          "targetX": 5,
          "targetY": 8
        }
      ]
    },
    {
      "sceneId": "classroom",
      "npcs": [
        {
          "id": "teacher",
          "name": "Wang Laoshi",
          "x": 5,
          "y": 2,
          "spriteColor": "#f56c6c",
          "dialogue": [
            { "speaker": "Wang Laoshi", "text": "欢迎来到教室！" },
            { "speaker": "Wang Laoshi", "text": "Welcome to the classroom!" },
            { "speaker": "Wang Laoshi", "text": "Let me test your Chinese knowledge..." }
          ],
          "challenge": {
            "type": "vocab_choice",
            "vocabIds": ["v1", "v2", "v3"]
          }
        },
        {
          "id": "student",
          "name": "Xiao Ming",
          "x": 3,
          "y": 5,
          "spriteColor": "#67c23a",
          "dialogue": [
            { "speaker": "Xiao Ming", "text": "嗨！我也在学习！" },
            { "speaker": "Xiao Ming", "text": "Hi! I'm learning too!" },
            { "speaker": "Xiao Ming", "text": "This sentence ordering is tricky..." }
          ],
          "challenge": {
            "type": "sentence_order",
            "vocabIds": ["v4"]
          }
        }
      ],
      "transfers": [
        {
          "id": "to_village",
          "x": 5,
          "y": 9,
          "width": 2,
          "height": 1,
          "targetScene": "village",
          "targetX": 17,
          "targetY": 5
        }
      ]
    }
  ]
}
```

**Step 4: vocabulary.json**

```json
{
  "vocabulary": [
    {
      "id": "v1",
      "term": "你好",
      "translation": "Hello",
      "pinyin": "nǐ hǎo",
      "context": "A common greeting used when meeting someone",
      "difficulty": 1,
      "distractors": ["Goodbye", "Thank you", "Sorry"]
    },
    {
      "id": "v2",
      "term": "谢谢",
      "translation": "Thank you",
      "pinyin": "xiè xie",
      "context": "Used to express gratitude",
      "difficulty": 1,
      "distractors": ["Hello", "Sorry", "Please"]
    },
    {
      "id": "v3",
      "term": "老师",
      "translation": "Teacher",
      "pinyin": "lǎo shī",
      "context": "A respectful term for a teacher or instructor",
      "difficulty": 1,
      "distractors": ["Student", "Friend", "Parent"]
    },
    {
      "id": "v4",
      "term": "我是学生",
      "translation": "I am a student",
      "pinyin": "wǒ shì xué shēng",
      "context": "A basic self-introduction sentence",
      "difficulty": 2,
      "segments": ["我", "是", "学生"],
      "segmentTranslations": ["I", "am", "a student"]
    }
  ]
}
```

**Step 5: Commit**

```bash
git add src/phaser/template/data/
git commit -m "feat: add sample data files for 2-scene demo"
```

---

## Task 3: BootScene — Procedural Assets + Data Loading

**Files:**
- Modify: `src/phaser/template/src/scenes/BootScene.js`

The BootScene creates procedural textures (colored tiles, player sprite, NPC sprites) and loads all JSON data files. No external image downloads.

**Step 1: Implement BootScene**

```js
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // Show loading text
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.loadingText = this.add.text(w / 2, h / 2, 'Loading...', {
      fontSize: '20px', color: '#e0e0e0'
    }).setOrigin(0.5);

    // Load JSON data
    this.load.json('config', 'data/config.json');
    this.load.json('maps', 'data/maps.json');
    this.load.json('events', 'data/events.json');
    this.load.json('vocabulary', 'data/vocabulary.json');
  }

  create() {
    // Store data in registry (accessible from all scenes)
    this.registry.set('config', this.cache.json.get('config'));
    this.registry.set('maps', this.cache.json.get('maps'));
    this.registry.set('events', this.cache.json.get('events'));
    this.registry.set('vocabulary', this.cache.json.get('vocabulary'));

    const tileSize = this.registry.get('config').tileSize || 32;

    // Generate tileset texture
    this._createTileset(tileSize);

    // Generate player texture
    this._createPlayerTexture(tileSize);

    // Generate NPC textures from event data
    this._createNpcTextures(tileSize);

    // Generate UI textures
    this._createUiTextures();

    this.loadingText.destroy();
    this.scene.start('TitleScene');
  }

  _createTileset(size) {
    const tileColors = {
      0: '#4a7c4f', // grass
      1: '#c4a46a', // path
      2: '#6b6b6b', // wall
      3: '#4a6fa5', // water
      4: '#8b7355', // floor (indoor)
      5: '#a0522d', // door
    };

    const canvas = this.textures.createCanvas('tileset', size * 6, size);
    const ctx = canvas.context;

    Object.entries(tileColors).forEach(([index, color]) => {
      const i = parseInt(index);
      ctx.fillStyle = color;
      ctx.fillRect(i * size, 0, size, size);

      // Add subtle grid lines
      ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(i * size + 0.5, 0.5, size - 1, size - 1);

      // Wall gets a brick pattern
      if (i === 2) {
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(i * size, size / 2);
        ctx.lineTo(i * size + size, size / 2);
        ctx.moveTo(i * size + size / 2, 0);
        ctx.lineTo(i * size + size / 2, size / 2);
        ctx.moveTo(i * size + size / 4, size / 2);
        ctx.lineTo(i * size + size / 4, size);
        ctx.moveTo(i * size + size * 3 / 4, size / 2);
        ctx.lineTo(i * size + size * 3 / 4, size);
        ctx.stroke();
      }

      // Water gets waves
      if (i === 3) {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let wx = 0; wx < size; wx += 4) {
          ctx.moveTo(i * size + wx, size / 3);
          ctx.lineTo(i * size + wx + 2, size / 3 - 2);
        }
        ctx.stroke();
      }
    });

    canvas.refresh();
  }

  _createPlayerTexture(size) {
    const canvas = this.textures.createCanvas('player', size, size);
    const ctx = canvas.context;
    const half = size / 2;

    // Body
    ctx.fillStyle = '#5b9bd5';
    ctx.beginPath();
    ctx.arc(half, half - 2, size / 3, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#ffd5a0';
    ctx.beginPath();
    ctx.arc(half, size / 4, size / 5, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator (small triangle at bottom)
    ctx.fillStyle = '#3a7bd5';
    ctx.beginPath();
    ctx.moveTo(half, size - 2);
    ctx.lineTo(half - 4, size - 8);
    ctx.lineTo(half + 4, size - 8);
    ctx.closePath();
    ctx.fill();

    canvas.refresh();
  }

  _createNpcTextures(size) {
    const events = this.registry.get('events');
    for (const scene of events.scenes) {
      for (const npc of scene.npcs) {
        const key = `npc_${npc.id}`;
        const canvas = this.textures.createCanvas(key, size, size);
        const ctx = canvas.context;
        const half = size / 2;

        // Body
        ctx.fillStyle = npc.spriteColor || '#e6a23c';
        ctx.beginPath();
        ctx.arc(half, half - 2, size / 3, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#ffd5a0';
        ctx.beginPath();
        ctx.arc(half, size / 4, size / 5, 0, Math.PI * 2);
        ctx.fill();

        // Name initial
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${size / 3}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(npc.name[0], half, half + 2);

        canvas.refresh();
      }
    }
  }

  _createUiTextures() {
    // Dialogue box background
    const dbCanvas = this.textures.createCanvas('dialogue_bg', 760, 160);
    const dbCtx = dbCanvas.context;
    this._roundRect(dbCtx, 0, 0, 760, 160, 12, 'rgba(10, 10, 30, 0.92)', 'rgba(100, 140, 200, 0.6)', 2);
    dbCanvas.refresh();

    // Choice button (normal)
    const btnCanvas = this.textures.createCanvas('btn_normal', 340, 50);
    const btnCtx = btnCanvas.context;
    this._roundRect(btnCtx, 0, 0, 340, 50, 8, 'rgba(40, 40, 80, 0.9)', 'rgba(100, 140, 200, 0.5)', 1);
    btnCanvas.refresh();

    // Choice button (hover)
    const btnHCanvas = this.textures.createCanvas('btn_hover', 340, 50);
    const btnHCtx = btnHCanvas.context;
    this._roundRect(btnHCtx, 0, 0, 340, 50, 8, 'rgba(60, 60, 120, 0.95)', 'rgba(140, 180, 255, 0.8)', 2);
    btnHCanvas.refresh();

    // Choice button (correct)
    const btnCCanvas = this.textures.createCanvas('btn_correct', 340, 50);
    const btnCCtx = btnCCanvas.context;
    this._roundRect(btnCCtx, 0, 0, 340, 50, 8, 'rgba(30, 100, 30, 0.9)', 'rgba(80, 200, 80, 0.8)', 2);
    btnCCanvas.refresh();

    // Choice button (wrong)
    const btnWCanvas = this.textures.createCanvas('btn_wrong', 340, 50);
    const btnWCtx = btnWCanvas.context;
    this._roundRect(btnWCtx, 0, 0, 340, 50, 8, 'rgba(120, 30, 30, 0.9)', 'rgba(255, 80, 80, 0.8)', 2);
    btnWCanvas.refresh();
  }

  _roundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth || 1; ctx.stroke(); }
  }
}
```

**Step 2: Verify**

Run: `npx serve src/phaser/template`
Should see loading text briefly, then jump to TitleScene stub.
Open browser console — no errors. Check that textures are created (no missing texture warnings).

**Step 3: Commit**

```bash
git add src/phaser/template/src/scenes/BootScene.js
git commit -m "feat: BootScene with procedural textures and data loading"
```

---

## Task 4: TitleScene

**Files:**
- Modify: `src/phaser/template/src/scenes/TitleScene.js`

**Step 1: Implement TitleScene**

```js
import { ProgressTracker } from '../systems/ProgressTracker.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const config = this.registry.get('config');
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    // Title
    this.add.text(w / 2, h / 3 - 30, config.title || 'Learn Quest', {
      fontSize: '36px', color: '#f0e6d3', fontFamily: 'Georgia, serif'
    }).setOrigin(0.5);

    // Subtitle
    if (config.subtitle) {
      this.add.text(w / 2, h / 3 + 20, config.subtitle, {
        fontSize: '16px', color: '#a0a0b0', fontFamily: 'sans-serif'
      }).setOrigin(0.5);
    }

    // New Game button
    const newGameBtn = this.add.text(w / 2, h / 2 + 40, '[ New Game ]', {
      fontSize: '22px', color: '#7ecbff', fontFamily: 'sans-serif'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    newGameBtn.on('pointerover', () => newGameBtn.setColor('#bfe6ff'));
    newGameBtn.on('pointerout', () => newGameBtn.setColor('#7ecbff'));
    newGameBtn.on('pointerdown', () => {
      ProgressTracker.reset();
      this._startGame();
    });

    // Continue button (if save exists)
    const save = ProgressTracker.load();
    if (save) {
      const continueBtn = this.add.text(w / 2, h / 2 + 80, '[ Continue ]', {
        fontSize: '22px', color: '#7ecbff', fontFamily: 'sans-serif'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      continueBtn.on('pointerover', () => continueBtn.setColor('#bfe6ff'));
      continueBtn.on('pointerout', () => continueBtn.setColor('#7ecbff'));
      continueBtn.on('pointerdown', () => this._startGame());
    }

    // Language info
    this.add.text(w / 2, h - 50, `${config.targetLanguage || 'Language'} → ${config.nativeLanguage || 'English'}`, {
      fontSize: '14px', color: '#606070'
    }).setOrigin(0.5);
  }

  _startGame() {
    const save = ProgressTracker.load();
    const maps = this.registry.get('maps');
    const startMapId = save?.currentScene || maps.maps[0].id;
    this.scene.start('MapScene', { mapId: startMapId });
  }
}
```

**Step 2: Create ProgressTracker stub** (so TitleScene compiles)

`src/phaser/template/src/systems/ProgressTracker.js`:
```js
const SAVE_KEY = 'learnquest_save';

export const ProgressTracker = {
  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  save(data) {
    try {
      const existing = this.load() || {};
      const merged = { ...existing, ...data, lastSaved: Date.now() };
      localStorage.setItem(SAVE_KEY, JSON.stringify(merged));
    } catch (e) { console.warn('Save failed:', e); }
  },

  reset() {
    localStorage.removeItem(SAVE_KEY);
  },

  // Track challenge results
  recordChallenge(vocabId, correct) {
    const save = this.load() || {};
    if (!save.challenges) save.challenges = {};
    if (!save.challenges[vocabId]) save.challenges[vocabId] = { attempts: 0, correct: 0 };
    save.challenges[vocabId].attempts++;
    if (correct) save.challenges[vocabId].correct++;
    this.save(save);
  },

  getScore() {
    const save = this.load();
    if (!save?.challenges) return { total: 0, correct: 0 };
    let total = 0, correct = 0;
    for (const v of Object.values(save.challenges)) {
      total += v.attempts;
      correct += v.correct;
    }
    return { total, correct };
  }
};
```

**Step 3: Verify**

Serve and check: title text, subtitle, "New Game" button clickable. Clicking starts MapScene (will be blank since MapScene is stub).

**Step 4: Commit**

```bash
git add src/phaser/template/src/scenes/TitleScene.js src/phaser/template/src/systems/ProgressTracker.js
git commit -m "feat: TitleScene with new game/continue + ProgressTracker"
```

---

## Task 5: MapScene — Tilemap Rendering + Player Movement

**Files:**
- Modify: `src/phaser/template/src/scenes/MapScene.js`

This is the biggest scene. It renders the tile grid, places the player, handles grid-based arrow key movement with collision, places NPCs, handles NPC interaction (Enter key), and handles transfer zones.

**Step 1: Implement MapScene**

```js
import { ProgressTracker } from '../systems/ProgressTracker.js';

export class MapScene extends Phaser.Scene {
  constructor() {
    super('MapScene');
  }

  init(data) {
    this.mapId = data.mapId;
    this.spawnX = data.spawnX;
    this.spawnY = data.spawnY;
  }

  create() {
    const maps = this.registry.get('maps');
    const events = this.registry.get('events');
    const config = this.registry.get('config');
    const tileSize = config.tileSize || 32;

    this.tileSize = tileSize;
    this.mapData = maps.maps.find(m => m.id === this.mapId);
    this.sceneEvents = events.scenes.find(s => s.sceneId === this.mapId);

    if (!this.mapData) {
      console.error('Map not found:', this.mapId);
      return;
    }

    // Render tilemap
    this._renderTilemap();

    // Place NPCs
    this.npcSprites = [];
    this._placeNpcs();

    // Place player
    const spawnX = this.spawnX ?? this.mapData.playerSpawn.x;
    const spawnY = this.spawnY ?? this.mapData.playerSpawn.y;
    this.player = this.add.image(
      spawnX * tileSize + tileSize / 2,
      spawnY * tileSize + tileSize / 2,
      'player'
    ).setDepth(10);
    this.playerGrid = { x: spawnX, y: spawnY };
    this.isMoving = false;

    // Camera
    const mapWidth = this.mapData.width * tileSize;
    const mapHeight = this.mapData.height * tileSize;
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    // If map is smaller than screen, center it
    if (mapWidth < 800 || mapHeight < 600) {
      this.cameras.main.setViewport(
        Math.max(0, (800 - mapWidth) / 2),
        Math.max(0, (600 - mapHeight) / 2),
        Math.min(800, mapWidth),
        Math.min(600, mapHeight)
      );
    }

    // Input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Map name display (brief)
    const nameText = this.add.text(400, 20, this.mapData.name, {
      fontSize: '18px', color: '#f0e6d3', backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.tweens.add({
      targets: nameText, alpha: 0, delay: 2000, duration: 1000,
      onComplete: () => nameText.destroy()
    });

    // Interaction hint
    this.hintText = this.add.text(400, 560, '', {
      fontSize: '14px', color: '#a0c0e0', backgroundColor: 'rgba(0,0,0,0.4)',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);

    // Save current scene
    ProgressTracker.save({ currentScene: this.mapId });

    // State
    this.dialogueActive = false;

    // Listen for dialogue/challenge end
    this.events.on('resume', () => {
      this.dialogueActive = false;
    });
  }

  update() {
    if (this.isMoving || this.dialogueActive) return;

    // Check interaction
    if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this._tryInteract();
      return;
    }

    // Movement
    let dx = 0, dy = 0;
    if (this.cursors.left.isDown) dx = -1;
    else if (this.cursors.right.isDown) dx = 1;
    else if (this.cursors.up.isDown) dy = -1;
    else if (this.cursors.down.isDown) dy = 1;

    if (dx !== 0 || dy !== 0) {
      this.facingDir = { x: dx, y: dy };
      this._tryMove(dx, dy);
    }

    // Update hint
    this._updateHint();
  }

  _renderTilemap() {
    const { ground } = this.mapData.layers;
    const ts = this.tileSize;

    for (let y = 0; y < ground.length; y++) {
      for (let x = 0; x < ground[y].length; x++) {
        const tileIndex = ground[y][x];
        this.add.image(x * ts + ts / 2, y * ts + ts / 2, 'tileset')
          .setCrop(tileIndex * ts, 0, ts, ts)
          .setDisplaySize(ts, ts)
          .setDepth(0);
      }
    }
  }

  _placeNpcs() {
    if (!this.sceneEvents) return;
    for (const npc of this.sceneEvents.npcs) {
      const sprite = this.add.image(
        npc.x * this.tileSize + this.tileSize / 2,
        npc.y * this.tileSize + this.tileSize / 2,
        `npc_${npc.id}`
      ).setDepth(5);

      // Name label above NPC
      this.add.text(
        npc.x * this.tileSize + this.tileSize / 2,
        npc.y * this.tileSize - 4,
        npc.name,
        { fontSize: '10px', color: '#fff', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 3, y: 1 } }
      ).setOrigin(0.5, 1).setDepth(6);

      this.npcSprites.push({ sprite, data: npc });
    }
  }

  _isWalkable(x, y) {
    const { collision } = this.mapData.layers;
    if (y < 0 || y >= collision.length || x < 0 || x >= collision[0].length) return false;
    if (collision[y][x] === 1) return false;

    // Check NPC collision
    if (this.sceneEvents) {
      for (const npc of this.sceneEvents.npcs) {
        if (npc.x === x && npc.y === y) return false;
      }
    }
    return true;
  }

  _tryMove(dx, dy) {
    const newX = this.playerGrid.x + dx;
    const newY = this.playerGrid.y + dy;

    if (!this._isWalkable(newX, newY)) return;

    // Check transfer
    if (this.sceneEvents) {
      for (const transfer of this.sceneEvents.transfers) {
        if (newX >= transfer.x && newX < transfer.x + (transfer.width || 1) &&
            newY >= transfer.y && newY < transfer.y + (transfer.height || 1)) {
          this._doTransfer(transfer);
          return;
        }
      }
    }

    this.isMoving = true;
    this.playerGrid.x = newX;
    this.playerGrid.y = newY;

    this.tweens.add({
      targets: this.player,
      x: newX * this.tileSize + this.tileSize / 2,
      y: newY * this.tileSize + this.tileSize / 2,
      duration: 150,
      ease: 'Linear',
      onComplete: () => { this.isMoving = false; }
    });
  }

  _doTransfer(transfer) {
    this.isMoving = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('MapScene', {
        mapId: transfer.targetScene,
        spawnX: transfer.targetX,
        spawnY: transfer.targetY
      });
    });
  }

  _getNpcInFront() {
    if (!this.sceneEvents || !this.facingDir) return null;
    const checkX = this.playerGrid.x + this.facingDir.x;
    const checkY = this.playerGrid.y + this.facingDir.y;
    return this.sceneEvents.npcs.find(n => n.x === checkX && n.y === checkY) || null;
  }

  _tryInteract() {
    const npc = this._getNpcInFront();
    if (!npc) return;

    this.dialogueActive = true;
    this.scene.pause();
    this.scene.launch('DialogueScene', {
      npc: npc,
      mapSceneKey: 'MapScene'
    });
  }

  _updateHint() {
    const npc = this._getNpcInFront();
    if (npc) {
      this.hintText.setText(`Press Enter to talk to ${npc.name}`);
      if (this.hintText.alpha === 0) {
        this.tweens.add({ targets: this.hintText, alpha: 1, duration: 200 });
      }
    } else {
      if (this.hintText.alpha > 0) {
        this.tweens.add({ targets: this.hintText, alpha: 0, duration: 200 });
      }
    }
  }
}
```

**Step 2: Verify**

Serve and check:
- Tile grid renders with colored tiles (grass, path, wall, water, floor, door)
- Player appears at spawn point
- Arrow keys move the player smoothly in 4 directions
- Player cannot walk through walls or water
- NPCs visible with name labels
- Walking to the door tile in village transfers to classroom
- "Press Enter to talk" hint appears near NPCs

**Step 3: Commit**

```bash
git add src/phaser/template/src/scenes/MapScene.js
git commit -m "feat: MapScene with tilemap, player movement, NPCs, transfers"
```

---

## Task 6: DialogueScene

**Files:**
- Modify: `src/phaser/template/src/scenes/DialogueScene.js`

Overlay scene: dark semi-transparent background at bottom, shows dialogue lines one by one. Enter key advances. After all lines, if NPC has a challenge, launches ChallengeScene.

**Step 1: Implement DialogueScene**

```js
export class DialogueScene extends Phaser.Scene {
  constructor() {
    super('DialogueScene');
  }

  init(data) {
    this.npc = data.npc;
    this.mapSceneKey = data.mapSceneKey;
    this.lineIndex = 0;
  }

  create() {
    const lines = this.npc.dialogue || [];
    this.lines = lines;

    // Dialogue box background
    this.dialogueBg = this.add.image(400, 520, 'dialogue_bg').setDepth(200);

    // Speaker name
    this.speakerText = this.add.text(60, 452, '', {
      fontSize: '16px', color: '#7ecbff', fontStyle: 'bold'
    }).setDepth(201);

    // Dialogue text
    this.dialogueText = this.add.text(60, 480, '', {
      fontSize: '18px', color: '#e0e0e0', wordWrap: { width: 680 }, lineSpacing: 6
    }).setDepth(201);

    // Advance hint
    this.advanceHint = this.add.text(730, 580, '▼', {
      fontSize: '16px', color: '#7ecbff'
    }).setDepth(201);
    this.tweens.add({
      targets: this.advanceHint, y: 585, duration: 500,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // Show first line
    this._showLine();

    // Input
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this._advance();
    }
  }

  _showLine() {
    if (this.lineIndex >= this.lines.length) {
      this._endDialogue();
      return;
    }
    const line = this.lines[this.lineIndex];
    this.speakerText.setText(line.speaker || '');
    this.dialogueText.setText(line.text || '');
  }

  _advance() {
    this.lineIndex++;
    this._showLine();
  }

  _endDialogue() {
    if (this.npc.challenge) {
      // Launch challenge scene
      this.scene.start('ChallengeScene', {
        challenge: this.npc.challenge,
        npcName: this.npc.name,
        mapSceneKey: this.mapSceneKey
      });
    } else {
      this._returnToMap();
    }
  }

  _returnToMap() {
    this.scene.stop();
    this.scene.resume(this.mapSceneKey);
  }
}
```

**Step 2: Verify**

Interact with Li Wei (guide NPC): dialogue box appears, shows each line on Enter press, closes after last line. Interact with Wang Laoshi: dialogue plays, then transitions to ChallengeScene (blank for now).

**Step 3: Commit**

```bash
git add src/phaser/template/src/scenes/DialogueScene.js
git commit -m "feat: DialogueScene with line-by-line advance"
```

---

## Task 7: ChallengeScene — Vocab Choice + Fill Blank + Sentence Order

**Files:**
- Modify: `src/phaser/template/src/scenes/ChallengeScene.js`

Three challenge types in one scene, selected by `challenge.type`.

**Step 1: Implement ChallengeScene**

```js
import { ProgressTracker } from '../systems/ProgressTracker.js';

export class ChallengeScene extends Phaser.Scene {
  constructor() {
    super('ChallengeScene');
  }

  init(data) {
    this.challenge = data.challenge;
    this.npcName = data.npcName;
    this.mapSceneKey = data.mapSceneKey;
  }

  create() {
    const vocab = this.registry.get('vocabulary').vocabulary;
    this.vocabItems = this.challenge.vocabIds.map(id => vocab.find(v => v.id === id)).filter(Boolean);
    this.currentIndex = 0;
    this.score = { correct: 0, total: 0 };

    // Background overlay
    this.add.rectangle(400, 300, 800, 600, 0x0a0a1e, 0.85).setDepth(200);

    // Title
    this.add.text(400, 30, `Challenge from ${this.npcName}`, {
      fontSize: '20px', color: '#7ecbff'
    }).setOrigin(0.5).setDepth(201);

    // Score display
    this.scoreText = this.add.text(700, 30, '', {
      fontSize: '16px', color: '#a0a0b0'
    }).setOrigin(0.5).setDepth(201);

    // Content container (cleared per question)
    this.contentGroup = this.add.group();

    this._showQuestion();
  }

  _clearContent() {
    this.contentGroup.clear(true, true);
  }

  _showQuestion() {
    this._clearContent();
    this.scoreText.setText(`${this.score.correct}/${this.score.total}`);

    if (this.currentIndex >= this.vocabItems.length) {
      this._showResults();
      return;
    }

    const item = this.vocabItems[this.currentIndex];
    const type = this.challenge.type;

    if (type === 'vocab_choice') this._vocabChoice(item);
    else if (type === 'fill_blank') this._fillBlank(item);
    else if (type === 'sentence_order') this._sentenceOrder(item);
    else this._vocabChoice(item); // fallback
  }

  // ── Vocab Choice ──────────────────────────────────
  _vocabChoice(item) {
    // Question: show the term
    const q = this.add.text(400, 120, item.term, {
      fontSize: '48px', color: '#f0e6d3'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(q);

    // Pinyin hint
    if (item.pinyin) {
      const py = this.add.text(400, 175, item.pinyin, {
        fontSize: '18px', color: '#a0a0b0'
      }).setOrigin(0.5).setDepth(201);
      this.contentGroup.add(py);
    }

    // Prompt
    const prompt = this.add.text(400, 220, 'What does this mean?', {
      fontSize: '16px', color: '#c0c0d0'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(prompt);

    // Build options: correct + distractors, shuffled
    const options = [item.translation, ...(item.distractors || [])].slice(0, 4);
    this._shuffle(options);

    options.forEach((opt, i) => {
      const y = 290 + i * 65;
      const btn = this.add.image(400, y, 'btn_normal').setDepth(201).setInteractive({ useHandCursor: true });
      const label = this.add.text(400, y, opt, {
        fontSize: '18px', color: '#e0e0e0'
      }).setOrigin(0.5).setDepth(202);

      this.contentGroup.add(btn);
      this.contentGroup.add(label);

      btn.on('pointerover', () => btn.setTexture('btn_hover'));
      btn.on('pointerout', () => btn.setTexture('btn_normal'));
      btn.on('pointerdown', () => {
        const correct = opt === item.translation;
        this._handleAnswer(correct, btn, item);
      });
    });
  }

  // ── Fill in the Blank ─────────────────────────────
  _fillBlank(item) {
    // For fill-blank, we show the translation with the term blanked out
    const sentence = `"${item.context}"`;
    const q = this.add.text(400, 120, sentence, {
      fontSize: '20px', color: '#f0e6d3', wordWrap: { width: 600 }, align: 'center'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(q);

    const blank = this.add.text(400, 190, `_____ means "${item.translation}"`, {
      fontSize: '24px', color: '#7ecbff'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(blank);

    const prompt = this.add.text(400, 230, 'Fill in the blank:', {
      fontSize: '16px', color: '#c0c0d0'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(prompt);

    // Options: correct term + random other terms
    const allVocab = this.registry.get('vocabulary').vocabulary;
    const otherTerms = allVocab.filter(v => v.id !== item.id).map(v => v.term).slice(0, 3);
    const options = [item.term, ...otherTerms].slice(0, 4);
    this._shuffle(options);

    options.forEach((opt, i) => {
      const y = 290 + i * 65;
      const btn = this.add.image(400, y, 'btn_normal').setDepth(201).setInteractive({ useHandCursor: true });
      const label = this.add.text(400, y, opt, {
        fontSize: '22px', color: '#e0e0e0'
      }).setOrigin(0.5).setDepth(202);

      this.contentGroup.add(btn);
      this.contentGroup.add(label);

      btn.on('pointerover', () => btn.setTexture('btn_hover'));
      btn.on('pointerout', () => btn.setTexture('btn_normal'));
      btn.on('pointerdown', () => {
        const correct = opt === item.term;
        this._handleAnswer(correct, btn, item);
      });
    });
  }

  // ── Sentence Ordering ─────────────────────────────
  _sentenceOrder(item) {
    if (!item.segments) {
      // Fallback to vocab choice if no segments
      this._vocabChoice(item);
      return;
    }

    const prompt = this.add.text(400, 100, 'Arrange the words in correct order:', {
      fontSize: '18px', color: '#c0c0d0'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(prompt);

    // Show translation as hint
    const hint = this.add.text(400, 140, `"${item.translation}"`, {
      fontSize: '20px', color: '#7ecbff'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(hint);

    // Scrambled segments
    const segments = [...item.segments];
    this._shuffle(segments);

    // Selected order area
    const selectedArea = this.add.text(400, 220, '[ Your answer will appear here ]', {
      fontSize: '22px', color: '#606080'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(selectedArea);

    const selected = [];
    const segmentButtons = [];

    // Segment buttons
    const startX = 400 - (segments.length - 1) * 80 / 2;
    segments.forEach((seg, i) => {
      const x = startX + i * 80;
      const btn = this.add.image(x, 340, 'btn_normal')
        .setDisplaySize(70, 45).setDepth(201)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, 340, seg, {
        fontSize: '20px', color: '#e0e0e0'
      }).setOrigin(0.5).setDepth(202);

      this.contentGroup.add(btn);
      this.contentGroup.add(label);
      segmentButtons.push({ btn, label, seg, used: false });

      btn.on('pointerdown', () => {
        if (segmentButtons[i].used) return;
        segmentButtons[i].used = true;
        btn.setAlpha(0.3);
        label.setAlpha(0.3);
        selected.push(seg);
        selectedArea.setText(selected.join(' '));
        selectedArea.setColor('#f0e6d3');

        // Check if all selected
        if (selected.length === item.segments.length) {
          const correct = selected.join('') === item.segments.join('');
          this._handleSentenceResult(correct, item, selectedArea);
        }
      });
    });

    // Reset button
    const resetBtn = this.add.text(400, 420, '[ Reset ]', {
      fontSize: '16px', color: '#e6a23c'
    }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
    this.contentGroup.add(resetBtn);

    resetBtn.on('pointerdown', () => {
      selected.length = 0;
      selectedArea.setText('[ Your answer will appear here ]');
      selectedArea.setColor('#606080');
      segmentButtons.forEach(sb => {
        sb.used = false;
        sb.btn.setAlpha(1);
        sb.label.setAlpha(1);
      });
    });
  }

  _handleSentenceResult(correct, item, displayText) {
    this.score.total++;
    if (correct) this.score.correct++;
    ProgressTracker.recordChallenge(item.id, correct);

    displayText.setColor(correct ? '#67c23a' : '#f56c6c');

    const feedback = this.add.text(400, 480, correct ? 'Correct!' : `Answer: ${item.segments.join('')}`, {
      fontSize: '20px', color: correct ? '#67c23a' : '#f56c6c'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(feedback);

    this.time.delayedCall(1500, () => {
      this.currentIndex++;
      this._showQuestion();
    });
  }

  // ── Shared ────────────────────────────────────────

  _handleAnswer(correct, btn, item) {
    this.score.total++;
    if (correct) this.score.correct++;
    ProgressTracker.recordChallenge(item.id, correct);

    btn.setTexture(correct ? 'btn_correct' : 'btn_wrong');

    // Show feedback
    const feedbackText = correct ? 'Correct!' : `Answer: ${item.translation}`;
    const feedback = this.add.text(400, 560, feedbackText, {
      fontSize: '20px', color: correct ? '#67c23a' : '#f56c6c'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(feedback);

    // Disable all buttons
    this.contentGroup.getChildren().forEach(child => {
      if (child.input) child.disableInteractive();
    });

    // Next question after delay
    this.time.delayedCall(1200, () => {
      this.currentIndex++;
      this._showQuestion();
    });
  }

  _showResults() {
    this._clearContent();

    this.add.text(400, 200, 'Challenge Complete!', {
      fontSize: '32px', color: '#f0e6d3'
    }).setOrigin(0.5).setDepth(201);

    this.add.text(400, 260, `Score: ${this.score.correct} / ${this.score.total}`, {
      fontSize: '24px', color: this.score.correct === this.score.total ? '#67c23a' : '#e6a23c'
    }).setOrigin(0.5).setDepth(201);

    const pct = this.score.total > 0 ? Math.round(this.score.correct / this.score.total * 100) : 0;
    this.add.text(400, 310, `${pct}% accuracy`, {
      fontSize: '18px', color: '#a0a0b0'
    }).setOrigin(0.5).setDepth(201);

    const continueBtn = this.add.text(400, 400, '[ Continue ]', {
      fontSize: '22px', color: '#7ecbff'
    }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });

    continueBtn.on('pointerover', () => continueBtn.setColor('#bfe6ff'));
    continueBtn.on('pointerout', () => continueBtn.setColor('#7ecbff'));
    continueBtn.on('pointerdown', () => {
      this.scene.stop();
      this.scene.resume(this.mapSceneKey);
    });
  }

  _shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
```

**Step 2: Verify**

- Talk to Wang Laoshi → dialogue → vocab choice challenge with 3 questions
- Talk to Xiao Ming → dialogue → sentence ordering challenge
- Correct answers show green, wrong show red with correct answer
- Score shown at end
- "Continue" returns to map

**Step 3: Commit**

```bash
git add src/phaser/template/src/scenes/ChallengeScene.js
git commit -m "feat: ChallengeScene with vocab choice, fill blank, sentence order"
```

---

## Task 8: Tilemap Rendering Fix — Use Individual Tile Sprites

**Files:**
- Modify: `src/phaser/template/src/scenes/BootScene.js` (adjust tileset creation)
- Modify: `src/phaser/template/src/scenes/MapScene.js` (fix `_renderTilemap`)

The initial `setCrop` approach with a single tileset image may not work cleanly with Phaser's image system. Switch to creating individual tile textures (`tile_0`, `tile_1`, etc.) for reliability.

**Step 1: Update BootScene `_createTileset`**

Replace the single-canvas tileset with individual tile textures:

```js
_createTileset(size) {
  const tileColors = [
    { fill: '#4a7c4f', name: 'grass' },     // 0
    { fill: '#c4a46a', name: 'path' },      // 1
    { fill: '#6b6b6b', name: 'wall' },      // 2
    { fill: '#4a6fa5', name: 'water' },     // 3
    { fill: '#8b7355', name: 'floor' },     // 4
    { fill: '#a0522d', name: 'door' },      // 5
  ];

  tileColors.forEach((tile, i) => {
    const canvas = this.textures.createCanvas(`tile_${i}`, size, size);
    const ctx = canvas.context;

    ctx.fillStyle = tile.fill;
    ctx.fillRect(0, 0, size, size);

    // Subtle grid line
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

    // Wall: brick pattern
    if (i === 2) {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2);
      ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size / 2);
      ctx.moveTo(size / 4, size / 2); ctx.lineTo(size / 4, size);
      ctx.moveTo(size * 3 / 4, size / 2); ctx.lineTo(size * 3 / 4, size);
      ctx.stroke();
    }

    // Water: wave lines
    if (i === 3) {
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      for (let wx = 2; wx < size; wx += 6) {
        ctx.moveTo(wx, size / 3);
        ctx.lineTo(wx + 3, size / 3 - 3);
      }
      ctx.stroke();
    }

    // Door: outline
    if (i === 5) {
      ctx.strokeStyle = 'rgba(255,200,100,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 2, size - 8, size - 4);
    }

    canvas.refresh();
  });
}
```

**Step 2: Update MapScene `_renderTilemap`**

```js
_renderTilemap() {
  const { ground } = this.mapData.layers;
  const ts = this.tileSize;

  for (let y = 0; y < ground.length; y++) {
    for (let x = 0; x < ground[y].length; x++) {
      const tileIndex = ground[y][x];
      this.add.image(x * ts + ts / 2, y * ts + ts / 2, `tile_${tileIndex}`)
        .setDepth(0);
    }
  }
}
```

**Step 3: Verify**

Serve — each tile type should render as a distinct colored square. Walls have brick pattern, water has waves, door has border.

**Step 4: Commit**

```bash
git add src/phaser/template/src/scenes/BootScene.js src/phaser/template/src/scenes/MapScene.js
git commit -m "fix: use individual tile textures for reliable rendering"
```

---

## Task 9: End-to-End Playthrough Verification + Polish

**Files:**
- May need minor fixes across any of the above files

**Step 1: Full playthrough test**

1. `cd src/phaser/template && npx serve .`
2. Open in browser
3. Title screen shows → click "New Game"
4. Village map loads → player at spawn
5. Move with arrow keys → collision works
6. Walk to Li Wei → hint appears → Enter → dialogue plays → closes
7. Walk east to door tile → fade out → classroom loads
8. Talk to Wang Laoshi → dialogue → vocab choice challenge → score
9. Talk to Xiao Ming → dialogue → sentence order challenge → score
10. Walk south to door → fade out → back to village
11. Refresh page → "Continue" button appears → resumes in last scene

**Step 2: Fix any issues found**

Common fixes:
- Camera viewport centering for small maps
- Keyboard input not captured after scene transitions (may need `this.input.keyboard.resetKeys()`)
- NPC sprite depth vs player depth when overlapping
- Transfer zone detection edge cases

**Step 3: Final commit**

```bash
git add -A src/phaser/template/
git commit -m "feat: Phase 1 complete — working Phaser game template with learning challenges"
```

---

## Task 10: Exclude Template from Next.js TypeScript Checking

**Files:**
- Modify: `tsconfig.json`

The Phaser template is vanilla JS meant for static serving, not part of the Next.js build. Exclude it from TS compilation.

**Step 1: Update tsconfig.json exclude**

Add `"src/phaser/template"` to the exclude array:

```json
"exclude": ["node_modules", "src/phaser/template"]
```

**Step 2: Verify Next.js still builds**

Run: `cd /Users/zihan/Downloads/Work/recent/rpggame-learn-quest && npx next build`

**Step 3: Commit**

```bash
git add tsconfig.json
git commit -m "chore: exclude Phaser template from TS compilation"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project setup + index.html + main.js + stubs | index.html, main.js, 5 scene stubs |
| 2 | Sample data (config, maps, events, vocabulary) | data/*.json |
| 3 | BootScene: procedural textures + data loading | BootScene.js |
| 4 | TitleScene + ProgressTracker | TitleScene.js, ProgressTracker.js |
| 5 | MapScene: tilemap, player, NPCs, transfers | MapScene.js |
| 6 | DialogueScene: text box overlay | DialogueScene.js |
| 7 | ChallengeScene: 3 challenge types | ChallengeScene.js |
| 8 | Tilemap rendering fix (individual tile textures) | BootScene.js, MapScene.js |
| 9 | End-to-end verification + polish | Various |
| 10 | Exclude template from TS build | tsconfig.json |
