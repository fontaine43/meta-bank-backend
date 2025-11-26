const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  from: String,
  to: String,
  amount: Number,
  date: { type: Date, default: Date.now },
  status: { type: String, default: 'completed' }
});

module.exports = mongoose.model('Transaction', transactionSchema);
