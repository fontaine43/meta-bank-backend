const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const User = require('../models/User');

router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      username: user.username,
      fullName: user.fullName,
      accountType: 'Checking',
      bankName: user.bankName || 'Meta Bank',
      accountNumber: '**** 9281',
      routingNumber: '1100001',
      balance: 1250000,
      availableBalance: 1248500
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', details: err.message });
  }
});

module.exports = router;
