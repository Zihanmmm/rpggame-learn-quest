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

    this._renderTilemap();

    this.npcSprites = [];
    this._placeNpcs();

    const spawnX = this.spawnX ?? this.mapData.playerSpawn.x;
    const spawnY = this.spawnY ?? this.mapData.playerSpawn.y;
    this.player = this.add.image(
      spawnX * tileSize + tileSize / 2,
      spawnY * tileSize + tileSize / 2,
      'player'
    ).setDepth(10);
    this.playerGrid = { x: spawnX, y: spawnY };
    this.isMoving = false;
    this.facingDir = { x: 0, y: 1 };

    const mapWidth = this.mapData.width * tileSize;
    const mapHeight = this.mapData.height * tileSize;
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    if (mapWidth < 800 || mapHeight < 600) {
      this.cameras.main.setViewport(
        Math.max(0, (800 - mapWidth) / 2),
        Math.max(0, (600 - mapHeight) / 2),
        Math.min(800, mapWidth),
        Math.min(600, mapHeight)
      );
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    const nameText = this.add.text(400, 20, this.mapData.name, {
      fontSize: '18px', color: '#f0e6d3', backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    this.tweens.add({
      targets: nameText, alpha: 0, delay: 2000, duration: 1000,
      onComplete: () => nameText.destroy()
    });

    this.hintText = this.add.text(400, 560, '', {
      fontSize: '14px', color: '#a0c0e0', backgroundColor: 'rgba(0,0,0,0.4)',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setAlpha(0);

    ProgressTracker.save({ currentScene: this.mapId });

    this.dialogueActive = false;

    this.events.on('resume', () => {
      this.dialogueActive = false;
    });
  }

  update() {
    if (this.isMoving || this.dialogueActive) return;

    if (Phaser.Input.Keyboard.JustDown(this.enterKey) || Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this._tryInteract();
      return;
    }

    let dx = 0, dy = 0;
    if (this.cursors.left.isDown) dx = -1;
    else if (this.cursors.right.isDown) dx = 1;
    else if (this.cursors.up.isDown) dy = -1;
    else if (this.cursors.down.isDown) dy = 1;

    if (dx !== 0 || dy !== 0) {
      this.facingDir = { x: dx, y: dy };
      this._tryMove(dx, dy);
    }

    this._updateHint();
  }

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

  _placeNpcs() {
    if (!this.sceneEvents) return;
    for (const npc of this.sceneEvents.npcs) {
      const sprite = this.add.image(
        npc.x * this.tileSize + this.tileSize / 2,
        npc.y * this.tileSize + this.tileSize / 2,
        `npc_${this.mapId}_${npc.id}`
      ).setDepth(5);

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
