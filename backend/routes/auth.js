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

// PROFILE (returns the current logged-in user directly)
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // ✅ Return raw user object (frontend expects this)
    return res.json(user);
  } catch (err) {
    console.error('❌ Profile fetch error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
