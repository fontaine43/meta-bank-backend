const User = require('../models/User');
const Loan = require('../models/Loan');
const Transfer = require('../models/Transfer');

// ✅ GET /api/user/profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error('❌ Profile fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch profile', details: err.message });
  }
};

// ✅ POST /api/user/loan
exports.applyLoan = async (req, res) => {
  try {
    if (!req.body || !req.body.amount || !req.body.purpose) {
      return res.status(400).json({ message: 'Loan amount and purpose are required' });
    }

    const loan = new Loan({ ...req.body, userId: req.user.id });
    await loan.save();

    res.status(201).json({ message: 'Loan application submitted successfully' });
  } catch (err) {
    console.error('❌ Loan application error:', err);
    res.status(500).json({ message: 'Loan application failed', details: err.message });
  }
};

// ✅ POST /api/user/transfer
exports.makeTransfer = async (req, res) => {
  try {
    if (!req.body || !req.body.amount || !req.body.recipientAccount) {
      return res.status(400).json({ message: 'Transfer amount and recipient account are required' });
    }

    const transfer = new Transfer({ ...req.body, userId: req.user.id });
    await transfer.save();

    res.status(201).json({ message: 'Transfer initiated successfully' });
  } catch (err) {
    console.error('❌ Transfer error:', err);
    res.status(500).json({ message: 'Transfer failed', details: err.message });
  }
};

// ✅ GET /api/user/loans
exports.getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ userId: req.user.id });
    res.status(200).json(loans);
  } catch (err) {
    console.error('❌ Fetch loans error:', err);
    res.status(500).json({ message: 'Failed to fetch loans', details: err.message });
  }
};

// ✅ GET /api/user/transfers
exports.getTransfers = async (req, res) => {
  try {
    const transfers = await Transfer.find({ userId: req.user.id });
    res.status(200).json(transfers);
  } catch (err) {
    console.error('❌ Fetch transfers error:', err);
    res.status(500).json({ message: 'Failed to fetch transfers', details: err.message });
  }
};
