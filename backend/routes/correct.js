const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const CorrectionLog = require('../models/CorrectionLog');

router.use(requireAuth);

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `You are a patient Mandarin Chinese tutor helping a beginner/intermediate
(roughly HSK1-4) learner practice writing sentences. The learner will send you a sentence
they wrote in Mandarin (it may contain English too, or be a mix). Your job:

1. Correct any grammar, word order, word choice, or character errors.
2. If the sentence is already correct, say so plainly.
3. Give a SHORT explanation (1-3 sentences, plain language, no jargon-heavy grammar terms
   unless necessary) of what was wrong and why the correction is right. If nothing was
   wrong, briefly say what they did well or note a more natural alternative if one exists.

Respond ONLY with strict JSON, no markdown fences, no extra text, in this exact shape:
{"corrected": "...", "explanation": "..."}`;

router.post('/', async (req, res) => {
  const { sentence } = req.body;
  if (!sentence || !sentence.trim()) return res.status(400).json({ error: 'Send a sentence to correct.' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server.' });

  try {
    const geminiRes = await fetch(`${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: sentence }] }],
        generationConfig: { temperature: 0.3 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini error:', errText);
      return res.status(502).json({ error: 'The correction service did not respond correctly. Try again in a moment.' });
    }

    const data = await geminiRes.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // Fallback: return the raw text as the explanation if it wasn't valid JSON
      parsed = { corrected: sentence, explanation: raw || "Couldn't parse a response — try rephrasing your sentence." };
    }

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const log = await CorrectionLog.create({
      date: dateStr,
      original: sentence,
      corrected: parsed.corrected || sentence,
      explanation: parsed.explanation || '',
    });

    res.json(log);
  } catch (err) {
    console.error('Correction route error:', err);
    res.status(500).json({ error: 'Something went wrong reaching the correction service.' });
  }
});

// Recent correction history, for progress tracking
router.get('/', async (req, res) => {
  const logs = await CorrectionLog.find().sort({ createdAt: -1 }).limit(100).lean();
  res.json(logs);
});

module.exports = router;
