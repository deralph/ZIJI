const mongoose = require('mongoose');

const VocabWordSchema = new mongoose.Schema(
  {
    word: { type: String, required: true },
    pinyin: { type: String, default: '' },
    meaning: { type: String, required: true },
    example: { type: String, default: '' },
    date: { type: String, default: '' }, // 'YYYY-MM-DD' when added

    // --- flashcard / spaced-repetition fields ---
    box: { type: Number, default: 1 },        // 1-5, higher = better known
    lastReviewed: { type: String, default: null }, // 'YYYY-MM-DD'
    nextDue: { type: String, default: null },      // 'YYYY-MM-DD', null = due now
  },

  { timestamps: true }
);

module.exports = mongoose.model('VocabWord', VocabWordSchema);
