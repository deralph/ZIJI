const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const VocabWord = require('../models/VocabWord');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const list = await VocabWord.find().sort({ createdAt: -1 }).lean();
  res.json(list);
});

router.post('/', async (req, res) => {
  const { word, pinyin, meaning, example, date } = req.body;
  if (!word || !meaning) return res.status(400).json({ error: 'word and meaning are required' });
  const item = await VocabWord.create({ word, pinyin, meaning, example, date });
  res.json(item);
});

router.delete('/:id', async (req, res) => {
  await VocabWord.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDays(dateStr, n) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const BOX_INTERVAL_DAYS = { 1: 1, 2: 2, 3: 4, 4: 7, 5: 14 };

router.get('/due', async (req, res) => {
  const today = todayStr();
  let due = await VocabWord.find({ $or: [{ nextDue: null }, { nextDue: { $lte: today } }] }).lean();
  if (due.length === 0) {
    due = await VocabWord.find().sort({ lastReviewed: 1 }).limit(20).lean();
  }
  res.json(due);
});

router.put('/:id/review', async (req, res) => {
  const { result } = req.body;
  const word = await VocabWord.findById(req.params.id);
  if (!word) return res.status(404).json({ error: 'Not found' });

  const today = todayStr();
  if (result === 'got_it') {
    word.box = Math.min(5, (word.box || 1) + 1);
  } else {
    word.box = 1;
  }
  word.lastReviewed = today;
  word.nextDue = addDays(today, BOX_INTERVAL_DAYS[word.box] || 1);
  await word.save();
  res.json(word);
});

module.exports = router;

