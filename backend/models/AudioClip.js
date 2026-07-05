const mongoose = require('mongoose');

const AudioClipSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // 'YYYY-MM-DD'
    url: { type: String, required: true },       // Cloudinary secure_url
    publicId: { type: String, required: true },  // Cloudinary public_id, needed to delete
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AudioClip', AudioClipSchema);
