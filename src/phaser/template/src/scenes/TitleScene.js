export class TitleScene extends Phaser.Scene {
  constructor() { super('TitleScene'); }
  create() {
    this.add.text(400, 300, 'Title Scene Stub', { fontSize: '24px', color: '#fff' }).setOrigin(0.5);
  }
}
