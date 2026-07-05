const mongoose = require('mongoose');

const CorrectionLogSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    original: { type: String, required: true },
    corrected: { type: String, required: true },
    explanation: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CorrectionLog', CorrectionLogSchema);
