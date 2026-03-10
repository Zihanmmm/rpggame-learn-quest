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
