const mongoose = require('mongoose');

const transferSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  toAccount: String,
  amount: Number,
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  initiatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transfer', transferSchema);
