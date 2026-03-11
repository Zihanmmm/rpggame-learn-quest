import { ProgressTracker } from '../systems/ProgressTracker.js';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    const config = this.registry.get('config');
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.add.text(w / 2, h / 3 - 30, config.title || 'Learn Quest', {
      fontSize: '36px', color: '#f0e6d3', fontFamily: 'Georgia, serif'
    }).setOrigin(0.5);

    if (config.subtitle) {
      this.add.text(w / 2, h / 3 + 20, config.subtitle, {
        fontSize: '16px', color: '#a0a0b0', fontFamily: 'sans-serif'
      }).setOrigin(0.5);
    }

    const newGameBtn = this.add.text(w / 2, h / 2 + 40, '[ New Game ]', {
      fontSize: '22px', color: '#7ecbff', fontFamily: 'sans-serif'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    newGameBtn.on('pointerover', () => newGameBtn.setColor('#bfe6ff'));
    newGameBtn.on('pointerout', () => newGameBtn.setColor('#7ecbff'));
    newGameBtn.on('pointerdown', () => {
      ProgressTracker.reset();
      this._startGame();
    });

    const save = ProgressTracker.load();
    if (save) {
      const continueBtn = this.add.text(w / 2, h / 2 + 80, '[ Continue ]', {
        fontSize: '22px', color: '#7ecbff', fontFamily: 'sans-serif'
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      continueBtn.on('pointerover', () => continueBtn.setColor('#bfe6ff'));
      continueBtn.on('pointerout', () => continueBtn.setColor('#7ecbff'));
      continueBtn.on('pointerdown', () => this._startGame());
    }

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
