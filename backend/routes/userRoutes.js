const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const User = require('../models/User');

// ✅ GET /api/user/profile — Secure profile fetch
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      dob: user.dob,
      address: user.address || 'Not provided',
      kycStatus: user.kycStatus || 'Pending',
      accountStatus: user.isVerified ? 'Active' : 'Inactive',
      accountType: 'Checking',
      bankName: user.bankName || 'Meta Bank',
      accountNumber: '**** 9281',
      routingNumber: '1100001',
      balance: 1250000,
      availableBalance: 1248500
    });
  } catch (err) {
    console.error('❌ Profile fetch error:', err);
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

module.exports = router;
