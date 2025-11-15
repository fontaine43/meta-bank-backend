const User = require('../models/User');
const Loan = require('../models/Loan');
const Transfer = require('../models/Transfer');

// =======================
// Profile & Dashboard
// =======================

// GET /api/user/profile — Basic profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (err) {
    console.error('❌ Profile fetch error:', err);
    res.status(500).json({
      message: 'Failed to fetch profile',
      details: err.message
    });
  }
};

// GET /api/user/account — Detailed dashboard profile
exports.getUserDashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      dob: user.dob,
      address: user.address || 'Not provided',
      kycStatus: user.kycStatus || 'Pending',
      accountStatus: user.isVerified ? 'Active' : 'Inactive',
      accountType: user.accountType || 'Checking',
      bankName: user.bankName || 'Meta Bank',
      accountNumber: user.accountNumber || '**** 9281',
      routingNumber: user.routingNumber || '1100001',
      balance: user.balance ?? 1250000,
      availableBalance: user.availableBalance ?? 1248500
    });
  } catch (err) {
    console.error('❌ Dashboard fetch error:', err);
    res.status(500).json({
      message: 'Failed to fetch dashboard',
      details: err.message
    });
  }
};

// =======================
// Loans & Transfers
// =======================

// POST /api/user/loan
exports.applyLoan = async (req, res) => {
  try {
    const { amount, purpose } = req.body;
    if (!amount || !purpose) {
      return res.status(400).json({ message: 'Loan amount and purpose are required' });
    }

    const loan = new Loan({ ...req.body, userId: req.user.id });
    await loan.save();

    res.status(201).json({ message: 'Loan application submitted successfully' });
  } catch (err) {
    console.error('❌ Loan application error:', err);
    res.status(500).json({
      message: 'Loan application failed',
      details: err.message
    });
  }
};

// POST /api/user/transfer
exports.makeTransfer = async (req, res) => {
  try {
    const { amount, recipientAccount } = req.body;
    if (!amount || !recipientAccount) {
      return res.status(400).json({ message: 'Transfer amount and recipient account are required' });
    }

    const transfer = new Transfer({ ...req.body, userId: req.user.id });
    await transfer.save();

    res.status(201).json({ message: 'Transfer initiated successfully' });
  } catch (err) {
    console.error('❌ Transfer error:', err);
    res.status(500).json({
      message: 'Transfer failed',
      details: err.message
    });
  }
};

// GET /api/user/loans
exports.getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ userId: req.user.id });
    res.status(200).json(loans);
  } catch (err) {
    console.error('❌ Fetch loans error:', err);
    res.status(500).json({
      message: 'Failed to fetch loans',
      details: err.message
    });
  }
};

// GET /api/user/transfers
exports.getTransfers = async (req, res) => {
  try {
    const transfers = await Transfer.find({ userId: req.user.id });
    res.status(200).json(transfers);
  } catch (err) {
    console.error('❌ Fetch transfers error:', err);
    res.status(500).json({
      message: 'Failed to fetch transfers',
      details: err.message
    });
  }
};

// =======================
// Email Verification
// =======================

// GET /api/user/verify?token=XYZ
exports.verifyAccount = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;
    await user.save();

    res.json({ success: true, message: 'Account verified successfully!' });
  } catch (err) {
    console.error('❌ Verification error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error verifying account',
      details: err.message
    });
  }
};
