const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, unique: true, required: true, lowercase: true },
  phone: { type: String, required: true },
  username: { type: String, unique: true, required: true, lowercase: true },
  password: { type: String, required: true },
  dob: { type: Date, required: true },
  ssn: { type: String, required: true },
  bankName: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'support'], default: 'user' },
  kycStatus: { type: String, enum: ['pending', 'approved', 'verified', 'rejected'], default: 'pending' },
  isVerified: { type: Boolean, default: false },
  accountNumber: { type: String, unique: true, sparse: true },
  accountType: { type: String, enum: ['checking', 'savings', 'business'], default: 'checking' },
  accountStatus: { type: String, enum: ['active', 'inactive'], default: 'inactive' },
  balance: { type: Number, default: 0 },
  availableBalance: { type: Number, default: 0 },
  routingNumber: { type: String, default: process.env.ROUTING_NUMBER || '231386894' },
  isSeeded: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
