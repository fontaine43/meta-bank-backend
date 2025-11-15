const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  phone: { type: String, required: true },
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  dob: { type: Date, required: true },
  ssn: { type: String, required: true },
  bankName: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  kycStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  idFront: { type: String, default: '' },
  idBack: { type: String, default: '' },
  isVerified: { type: Boolean, default: false }, // ✅ added to track email verification
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
