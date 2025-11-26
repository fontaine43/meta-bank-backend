const mongoose = require('mongoose');
const { Schema } = mongoose;

const ticketSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ['open', 'resolved'], default: 'open' }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
