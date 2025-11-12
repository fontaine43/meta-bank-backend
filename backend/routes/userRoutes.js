const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const {
  getProfile,
  applyLoan,
  makeTransfer,
  getLoans,
  getTransfers
} = require('../controllers/userController');

router.get('/profile', verifyToken, getProfile);
router.post('/loan/apply', verifyToken, applyLoan);
router.post('/transfer', verifyToken, makeTransfer);
router.get('/loan', verifyToken, getLoans);
router.get('/transfer', verifyToken, getTransfers);

module.exports = router;
