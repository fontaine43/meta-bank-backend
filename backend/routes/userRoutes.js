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
  verifyAccount,          // ✅ email verification
  getStatements,          // ✅ statements
  getInvestments,         // ✅ investments
  getIRA,                 // ✅ IRA accounts
  getExternalAccounts,    // ✅ external accounts
  getSummary,             // ✅ account summary
  getVerificationStatus   // ✅ verification status
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

// =======================
// Extra Feature Endpoints
// =======================

// GET /api/user/statements — Transaction statements
router.get('/statements', verifyToken, getStatements);

// GET /api/user/investments — Investment records
router.get('/investments', verifyToken, getInvestments);

// GET /api/user/ira — IRA accounts
router.get('/ira', verifyToken, getIRA);

// GET /api/user/external-accounts — Linked external accounts
router.get('/external-accounts', verifyToken, getExternalAccounts);

// GET /api/user/summary — Account summary (balance + activity)
router.get('/summary', verifyToken, getSummary);

// GET /api/user/verification — Verification status
router.get('/verification', verifyToken, getVerificationStatus);

module.exports = router;
