const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const LinkItem = require('../models/LinkItem');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const list = await LinkItem.find().lean();
  res.json(list);
});

router.post('/', async (req, res) => {
  const { title, url, cat } = req.body;
  if (!title || !url) return res.status(400).json({ error: 'title and url are required' });
  const item = await LinkItem.create({ title, url, cat });
  res.json(item);
});

router.delete('/:id', async (req, res) => {
  await LinkItem.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
