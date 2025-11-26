const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Keep enums lowercase internally
 */
const userSchema = new Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true }, // unique already creates index
  phone: { type: String, required: true },
  username: { type: String, unique: true, required: true, lowercase: true }, // unique already creates index
  password: { type: String, required: true },
  dob: { type: Date, required: true },
  ssn: { type: String, required: true },
  bankName: { type: String, required: true },

  role: { type: String, enum: ['user', 'admin', 'support'], default: 'user' },
  kycStatus: { type: String, enum: ['pending', 'approved', 'verified', 'rejected'], default: 'pending' },

  idFront: { type: String, default: '' },
  idBack: { type: String, default: '' },
  isVerified: { type: Boolean, default: false },

  accountNumber: { type: String, unique: true, sparse: true }, // unique already creates index
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

// ❌ Remove these duplicates:
// userSchema.index({ email: 1 });
// userSchema.index({ username: 1 });
// userSchema.index({ accountNumber: 1 });
// userSchema.index({ kycStatus: 1 });

