const mongoose = require('mongoose');

const LinkItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  cat: { type: String, default: 'Other' },
});

module.exports = mongoose.model('LinkItem', LinkItemSchema);
