const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const Setting = require('../models/Setting');

router.use(requireAuth);

router.get('/startDate', async (req, res) => {
  const s = await Setting.findOne({ key: 'startDate' });
  res.json({ startDate: s ? s.value : null });
});

router.put('/startDate', async (req, res) => {
  const { startDate } = req.body;
  await Setting.findOneAndUpdate({ key: 'startDate' }, { value: startDate }, { upsert: true });
  res.json({ ok: true });
});

module.exports = router;
