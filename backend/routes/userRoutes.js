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

// GET /api/user/profile — Basic profile info
router.get('/profile', verifyToken, getProfile);

// GET /api/user/account — Dashboard-style detailed profile
router.get('/account', verifyToken, getUserDashboard);

// =======================
// Loans & Transfers
// =======================

// POST /api/user/loan — Loan application
router.post('/loan', verifyToken, applyLoan);

// POST /api/user/transfer — Transfer initiation
router.post('/transfer', verifyToken, makeTransfer);

// GET /api/user/loans — Loan history
router.get('/loans', verifyToken, getLoans);

// GET /api/user/transfers — Transfer history
router.get('/transfers', verifyToken, getTransfers);

// =======================
// Email Verification
// =======================

// GET /api/user/verify?token=XYZ — Public route (no token required)
router.get('/verify', verifyAccount);

module.exports = router;
