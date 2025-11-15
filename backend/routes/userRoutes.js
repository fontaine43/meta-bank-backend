const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware'); // ✅ fixed: destructure properly
const {
  getProfile,
  getUserDashboard,
  applyLoan,
  makeTransfer,
  getLoans,
  getTransfers
} = require('../controllers/userController');

// ✅ Confirm middleware and controller functions
console.log('✅ typeof verifyToken:', typeof verifyToken); // should be 'function'

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
