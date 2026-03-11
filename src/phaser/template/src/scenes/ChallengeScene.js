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

    this.add.rectangle(400, 300, 800, 600, 0x0a0a1e, 0.85).setDepth(200);

    this.add.text(400, 30, `Challenge from ${this.npcName}`, {
      fontSize: '20px', color: '#7ecbff'
    }).setOrigin(0.5).setDepth(201);

    this.scoreText = this.add.text(700, 30, '', {
      fontSize: '16px', color: '#a0a0b0'
    }).setOrigin(0.5).setDepth(201);

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
    else this._vocabChoice(item);
  }

  _vocabChoice(item) {
    const q = this.add.text(400, 120, item.term, {
      fontSize: '48px', color: '#f0e6d3'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(q);

    if (item.pinyin) {
      const py = this.add.text(400, 175, item.pinyin, {
        fontSize: '18px', color: '#a0a0b0'
      }).setOrigin(0.5).setDepth(201);
      this.contentGroup.add(py);
    }

    const prompt = this.add.text(400, 220, 'What does this mean?', {
      fontSize: '16px', color: '#c0c0d0'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(prompt);

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

  _fillBlank(item) {
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

  _sentenceOrder(item) {
    if (!item.segments) {
      this._vocabChoice(item);
      return;
    }

    const prompt = this.add.text(400, 100, 'Arrange the words in correct order:', {
      fontSize: '18px', color: '#c0c0d0'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(prompt);

    const hint = this.add.text(400, 140, `"${item.translation}"`, {
      fontSize: '20px', color: '#7ecbff'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(hint);

    const segments = [...item.segments];
    this._shuffle(segments);

    const selectedArea = this.add.text(400, 220, '[ Your answer will appear here ]', {
      fontSize: '22px', color: '#606080'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(selectedArea);

    const selected = [];
    const segmentButtons = [];

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

        if (selected.length === item.segments.length) {
          const correct = selected.join('') === item.segments.join('');
          this._handleSentenceResult(correct, item, selectedArea);
        }
      });
    });

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

  _handleAnswer(correct, btn, item) {
    this.score.total++;
    if (correct) this.score.correct++;
    ProgressTracker.recordChallenge(item.id, correct);

    btn.setTexture(correct ? 'btn_correct' : 'btn_wrong');

    const feedbackText = correct ? 'Correct!' : `Answer: ${item.translation}`;
    const feedback = this.add.text(400, 560, feedbackText, {
      fontSize: '20px', color: correct ? '#67c23a' : '#f56c6c'
    }).setOrigin(0.5).setDepth(201);
    this.contentGroup.add(feedback);

    this.contentGroup.getChildren().forEach(child => {
      if (child.input) child.disableInteractive();
    });

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
