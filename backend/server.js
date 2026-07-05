require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const dayRoutes = require('./routes/days');
const vocabRoutes = require('./routes/vocab');
const linkRoutes = require('./routes/links');
const settingsRoutes = require('./routes/settings');
const correctRoutes = require('./routes/correct');
const audioRoutes = require('./routes/audio');


const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
}));
app.use(express.json());

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}
if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

app.use('/api/auth', authRoutes);
app.use('/api/days', dayRoutes);
app.use('/api/vocab', vocabRoutes);
app.use('/api/links', linkRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/correct', correctRoutes);
app.use('/api/audio', audioRoutes);


app.get('/', (req, res) => {
  res.send('字迹 Mandarin Tracker API is running.');
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
