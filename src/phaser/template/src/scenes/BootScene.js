export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.loadingText = this.add.text(w / 2, h / 2, 'Loading...', {
      fontSize: '20px', color: '#e0e0e0'
    }).setOrigin(0.5);

    this.load.json('config', 'data/config.json');
    this.load.json('maps', 'data/maps.json');
    this.load.json('events', 'data/events.json');
    this.load.json('vocabulary', 'data/vocabulary.json');
  }

  create() {
    this.registry.set('config', this.cache.json.get('config'));
    this.registry.set('maps', this.cache.json.get('maps'));
    this.registry.set('events', this.cache.json.get('events'));
    this.registry.set('vocabulary', this.cache.json.get('vocabulary'));

    const tileSize = this.registry.get('config').tileSize || 32;

    this._createTileset(tileSize);
    this._createPlayerTexture(tileSize);
    this._createNpcTextures(tileSize);
    this._createUiTextures();

    this.loadingText.destroy();
    this.scene.start('TitleScene');
  }

  _createTileset(size) {
    const tileColors = [
      { fill: '#4a7c4f', name: 'grass' },
      { fill: '#c4a46a', name: 'path' },
      { fill: '#6b6b6b', name: 'wall' },
      { fill: '#4a6fa5', name: 'water' },
      { fill: '#8b7355', name: 'floor' },
      { fill: '#a0522d', name: 'door' },
    ];

    tileColors.forEach((tile, i) => {
      const canvas = this.textures.createCanvas(`tile_${i}`, size, size);
      const ctx = canvas.context;

      ctx.fillStyle = tile.fill;
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

      if (i === 2) {
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.moveTo(0, size / 2); ctx.lineTo(size, size / 2);
        ctx.moveTo(size / 2, 0); ctx.lineTo(size / 2, size / 2);
        ctx.moveTo(size / 4, size / 2); ctx.lineTo(size / 4, size);
        ctx.moveTo(size * 3 / 4, size / 2); ctx.lineTo(size * 3 / 4, size);
        ctx.stroke();
      }

      if (i === 3) {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        for (let wx = 2; wx < size; wx += 6) {
          ctx.moveTo(wx, size / 3);
          ctx.lineTo(wx + 3, size / 3 - 3);
        }
        ctx.stroke();
      }

      if (i === 5) {
        ctx.strokeStyle = 'rgba(255,200,100,0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(4, 2, size - 8, size - 4);
      }

      canvas.refresh();
    });
  }

  _createPlayerTexture(size) {
    const canvas = this.textures.createCanvas('player', size, size);
    const ctx = canvas.context;
    const half = size / 2;

    ctx.fillStyle = '#5b9bd5';
    ctx.beginPath();
    ctx.arc(half, half - 2, size / 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd5a0';
    ctx.beginPath();
    ctx.arc(half, size / 4, size / 5, 0, Math.PI * 2);
    ctx.fill();

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

        ctx.fillStyle = npc.spriteColor || '#e6a23c';
        ctx.beginPath();
        ctx.arc(half, half - 2, size / 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffd5a0';
        ctx.beginPath();
        ctx.arc(half, size / 4, size / 5, 0, Math.PI * 2);
        ctx.fill();

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
    const dbCanvas = this.textures.createCanvas('dialogue_bg', 760, 160);
    const dbCtx = dbCanvas.context;
    this._roundRect(dbCtx, 0, 0, 760, 160, 12, 'rgba(10, 10, 30, 0.92)', 'rgba(100, 140, 200, 0.6)', 2);
    dbCanvas.refresh();

    const btnConfigs = [
      { key: 'btn_normal', fill: 'rgba(40, 40, 80, 0.9)', stroke: 'rgba(100, 140, 200, 0.5)', lw: 1 },
      { key: 'btn_hover', fill: 'rgba(60, 60, 120, 0.95)', stroke: 'rgba(140, 180, 255, 0.8)', lw: 2 },
      { key: 'btn_correct', fill: 'rgba(30, 100, 30, 0.9)', stroke: 'rgba(80, 200, 80, 0.8)', lw: 2 },
      { key: 'btn_wrong', fill: 'rgba(120, 30, 30, 0.9)', stroke: 'rgba(255, 80, 80, 0.8)', lw: 2 },
    ];

    for (const cfg of btnConfigs) {
      const c = this.textures.createCanvas(cfg.key, 340, 50);
      this._roundRect(c.context, 0, 0, 340, 50, 8, cfg.fill, cfg.stroke, cfg.lw);
      c.refresh();
    }
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
