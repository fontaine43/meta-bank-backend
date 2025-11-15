const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  userEmail: { 
    type: String, 
    required: true 
  }, // ✅ makes it easier to display in admin panel
  issue: { 
    type: String, 
    required: true, 
    trim: true 
  },
  status: { 
    type: String, 
    enum: ['open', 'resolved'], 
    default: 'open' 
  },
  ticketId: { 
    type: String, 
    unique: true 
  }, // ✅ human-readable ticket reference (#1024 etc.)
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Auto-generate ticketId if not provided
ticketSchema.pre('save', function(next) {
  if (!this.ticketId) {
    this.ticketId = `T-${Date.now()}`;
  }
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
