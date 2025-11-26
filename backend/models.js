const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Keep enums lowercase internally
 */
const userSchema = new Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true }, // removed index: true
  phone: { type: String, required: true },
  username: { type: String, unique: true, required: true, lowercase: true }, // removed index: true
  password: { type: String, required: true },
  dob: { type: Date, required: true },
  ssn: { type: String, required: true },
  bankName: { type: String, required: true },

  role: { type: String, enum: ['user', 'admin', 'support'], default: 'user' },
  kycStatus: { type: String, enum: ['pending', 'approved', 'verified', 'rejected'], default: 'pending' },

  idFront: { type: String, default: '' },
  idBack: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },

  accountNumber: { type: String, unique: true, sparse: true },
  accountType: { type: String, enum: ['checking', 'savings', 'business'], default: 'checking' },
  accountStatus: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
  balance: { type: Number, default: 0 },
  availableBalance: { type: Number, default: 0 },
  routingNumber: { type: String, default: process.env.ROUTING_NUMBER || '231386894' },
  isSeeded: { type: Boolean, default: false },

  businessName: { type: String, trim: true },
  dba: { type: String, trim: true },
  ein: { type: String, trim: true },
  businessAddress: { type: String, trim: true },
  businessEmail: { type: String, trim: true },
  businessPhone: { type: String, trim: true },
  einLetter: { type: String },
  certOrArticles: { type: String },

  statements: [{ type: Object }],
  investments: [{ type: Object }],
  externalAccounts: [{ type: Object }],
  recentActivity: [{ type: Object }],
  iraAccounts: [{ type: Object }],

  lastLogin: { type: Date },
  verificationToken: { type: String },
  verificationTokenExpiry: { type: Date }
}, { timestamps: true });

// Keep only one index definition per field
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });
userSchema.index({ accountNumber: 1 });
userSchema.index({ kycStatus: 1 });

const loanSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['personal', 'business'], required: true },
  amount: { type: Number, required: true, min: 0 },
  purpose: { type: String, required: true, trim: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  appliedAt: { type: Date, default: Date.now },
  reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewNotes: { type: String, trim: true }
}, { timestamps: true });

loanSchema.index({ status: 1, appliedAt: -1 });
loanSchema.index({ userId: 1, type: 1 });

const transferSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  toAccount: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  type: { type: String, trim: true }, // "Domestic" | "Wire"
  notes: { type: String, trim: true },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  initiatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  transferId: { type: String, unique: true }
}, { timestamps: true });

transferSchema.pre('save', function (next) {
  if (!this.transferId) {
    const randomSuffix = Math.floor(Math.random() * 1000);
    this.transferId = `TR-${Math.floor(Date.now() / 1000)}-${randomSuffix}`;
  }
  next();
});
transferSchema.index({ initiatedAt: -1 });

const ticketSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  userEmail: { type: String, required: true, trim: true },
  issue: { type: String, required: true, trim: true },
  priority: { type: String, trim: true }, // High | Medium | Low
  status: { type: String, enum: ['open', 'resolved'], default: 'open' },
  ticketId: { type: String, unique: true },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  resolutionNotes: { type: String, trim: true }
}, { timestamps: true });

ticketSchema.pre('save', function (next) {
  if (!this.ticketId) {
    const randomSuffix = Math.floor(Math.random() * 1000);
    this.ticketId = `T-${Math.floor(Date.now() / 1000)}-${randomSuffix}`;
  }
  next();
});
ticketSchema.index({ userId: 1, status: 1 });

module.exports = {
  User: mongoose.model('User', userSchema),
  Loan: mongoose.model('Loan', loanSchema),
  Transfer: mongoose.model('Transfer', transferSchema),
  Ticket: mongoose.model('Ticket', ticketSchema)
};
