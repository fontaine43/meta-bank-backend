const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');
const { verifyUser } = require('../controllers/verifyController');
const { verifyToken } = require('../middleware/authMiddleware');
const User = require('../models/User');

// REGISTER
router.post('/register', register);

// LOGIN
router.post('/login', login);

// VERIFY EMAIL
router.get('/verify', verifyUser);

// PROFILE (always returns current logged-in user)
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.json({ success: true, user });
  } catch (err) {
    console.error('❌ Profile fetch error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
