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

    this.dialogueBg = this.add.image(400, 520, 'dialogue_bg').setDepth(200);

    this.speakerText = this.add.text(60, 452, '', {
      fontSize: '16px', color: '#7ecbff', fontStyle: 'bold'
    }).setDepth(201);

    this.dialogueText = this.add.text(60, 480, '', {
      fontSize: '18px', color: '#e0e0e0', wordWrap: { width: 680 }, lineSpacing: 6
    }).setDepth(201);

    this.advanceHint = this.add.text(730, 580, '▼', {
      fontSize: '16px', color: '#7ecbff'
    }).setDepth(201);
    this.tweens.add({
      targets: this.advanceHint, y: 585, duration: 500,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    this._showLine();

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
