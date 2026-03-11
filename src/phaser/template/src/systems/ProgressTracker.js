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
