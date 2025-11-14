const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const {
  getProfile,
  getUserDashboard,
  applyLoan,
  makeTransfer,
  getLoans,
  getTransfers
} = require('../controllers/userController');

// ✅ Basic profile info
router.get('/profile', verifyToken, getProfile);

// ✅ Dashboard-style detailed profile
router.get('/account', verifyToken, getUserDashboard);

// ✅ Loan application
router.post('/loan', verifyToken, applyLoan);

// ✅ Transfer initiation
router.post('/transfer', verifyToken, makeTransfer);

// ✅ Loan history
router.get('/loans', verifyToken, getLoans);

// ✅ Transfer history
router.get('/transfers', verifyToken, getTransfers);

module.exports = router;
