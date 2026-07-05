const mongoose = require('mongoose');

const DayEntrySchema = new mongoose.Schema({
  date: { type: String, unique: true, required: true }, // 'YYYY-MM-DD'
  grammar: { type: Boolean, default: false },
  vocab: { type: Boolean, default: false },
  tones: { type: Boolean, default: false },
  input: { type: Boolean, default: false },
  output: { type: Boolean, default: false },
  journal: { type: String, default: '' },
  speakNote: { type: String, default: '' },
});

module.exports = mongoose.model('DayEntry', DayEntrySchema);
