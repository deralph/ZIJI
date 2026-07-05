const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const AudioClip = require('../models/AudioClip');

router.use(requireAuth);

// The frontend uploads the audio file directly to Cloudinary (unsigned upload),
// then sends us just the resulting URL + publicId to save as a reference.
router.get('/', async (req, res) => {
  const { date } = req.query;
  const filter = date ? { date } : {};
  const clips = await AudioClip.find(filter).sort({ createdAt: -1 }).lean();
  res.json(clips);
});

router.post('/', async (req, res) => {
  const { date, url, publicId, note } = req.body;
  if (!date || !url || !publicId) return res.status(400).json({ error: 'date, url, and publicId are required' });
  const clip = await AudioClip.create({ date, url, publicId, note: note || '' });
  res.json(clip);
});

router.delete('/:id', async (req, res) => {
  const clip = await AudioClip.findById(req.params.id);
  if (!clip) return res.status(404).json({ error: 'Not found' });

  // Delete the actual file from Cloudinary too, not just our reference to it.
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const crypto = require('crypto');
      const toSign = `public_id=${clip.publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
      const signature = crypto.createHash('sha1').update(toSign).digest('hex');

      await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/video/destroy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_id: clip.publicId,
          timestamp,
          api_key: process.env.CLOUDINARY_API_KEY,
          signature,
        }),
      });
    } catch (e) {
      console.error('Cloudinary delete failed (continuing to delete our record anyway):', e.message);
    }
  }

  await AudioClip.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
