const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const { getUserProfile } = require('../controllers/userController');

// ✅ GET /api/user/profile — Secure profile fetch
router.get('/profile', verifyToken, getUserProfile);

module.exports = router;
