// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getProfile,
  getUserDashboard,
  applyLoan,
  makeTransfer,
  getLoans,
  getTransfers,
  verifyAccount // ✅ added for email verification
} = require('../controllers/userController');

// =======================
// User Profile & Dashboard
// =======================

// Basic profile info
router.get('/profile', verifyToken, getProfile);

// Dashboard-style detailed profile
router.get('/account', verifyToken, getUserDashboard);

// =======================
// Loans & Transfers
// =======================

// Loan application
router.post('/loan', verifyToken, applyLoan);

// Transfer initiation
router.post('/transfer', verifyToken, makeTransfer);

// Loan history
router.get('/loans', verifyToken, getLoans);

// Transfer history
router.get('/transfers', verifyToken, getTransfers);

// =======================
// Email Verification
// =======================

// Public route (no token required) for email verification
router.get('/verify', verifyAccount);

module.exports = router;
