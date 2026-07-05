const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Setting = require('../models/Setting');
const requireAuth = require('../middleware/auth');

// Tells the frontend whether a PIN has ever been created (decides Setup vs Login screen)
router.get('/status', async (req, res) => {
  const s = await Setting.findOne({ key: 'pinHash' });
  res.json({ hasPin: !!s });
});

// First-time setup — only works if no PIN exists yet
router.post('/setup', async (req, res) => {
  const existing = await Setting.findOne({ key: 'pinHash' });
  if (existing) return res.status(400).json({ error: 'A PIN already exists. Use login or change it from Settings.' });

  const { pin } = req.body;
  if (!pin || pin.length < 4) return res.status(400).json({ error: 'PIN must be at least 4 characters.' });

  const hash = await bcrypt.hash(pin, 10);
  await Setting.create({ key: 'pinHash', value: hash });
  const token = jwt.sign({ ok: true }, process.env.JWT_SECRET, { expiresIn: '90d' });
  res.json({ token });
});

router.post('/login', async (req, res) => {
  const { pin } = req.body;
  const s = await Setting.findOne({ key: 'pinHash' });
  if (!s) return res.status(400).json({ error: 'No PIN has been set up yet.' });

  const match = await bcrypt.compare(pin || '', s.value);
  if (!match) return res.status(401).json({ error: 'Incorrect PIN' });

  const token = jwt.sign({ ok: true }, process.env.JWT_SECRET, { expiresIn: '90d' });
  res.json({ token });
});

// Change PIN — requires an existing valid session
router.post('/change', requireAuth, async (req, res) => {
  const { newPin } = req.body;
  if (!newPin || newPin.length < 4) return res.status(400).json({ error: 'PIN must be at least 4 characters.' });
  const hash = await bcrypt.hash(newPin, 10);
  await Setting.findOneAndUpdate({ key: 'pinHash' }, { value: hash }, { upsert: true });
  res.json({ ok: true });
});

module.exports = router;
