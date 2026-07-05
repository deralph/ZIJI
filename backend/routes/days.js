const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const DayEntry = require('../models/DayEntry');

router.use(requireAuth);

// GET /api/days?month=YYYY-MM  -> all entries in that month
// GET /api/days                -> all entries
router.get('/', async (req, res) => {
  const { month } = req.query;
  const filter = month ? { date: { $regex: '^' + month } } : {};
  const days = await DayEntry.find(filter).lean();
  res.json(days);
});

router.get('/:date', async (req, res) => {
  const day = await DayEntry.findOne({ date: req.params.date }).lean();
  res.json(day || null);
});

// Upserts — creates the day if it doesn't exist yet, otherwise merges fields
router.put('/:date', async (req, res) => {
  const update = req.body;
  const day = await DayEntry.findOneAndUpdate(
    { date: req.params.date },
    { $set: { ...update, date: req.params.date } },
    { upsert: true, new: true }
  );
  res.json(day);
});

module.exports = router;
