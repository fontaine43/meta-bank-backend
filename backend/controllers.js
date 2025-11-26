const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./user');
const Loan = require('./loan');
const Transfer = require('./transfer');
const Ticket = require('./ticket');

const {
  sendVerificationEmail,
  notifyAdminOfNewUser,
  generateAccountNumber,
  ROUTING_NUMBER,
  seedDisplayBalance
} = require('./utils');

/** Helpers */
const ok = (res, payload) => res.status(200).json(payload);
const created = (res, payload) => res.status(201).json(payload);
const bad = (res, msg) => res.status(400).json({ success: false, message: msg });
const notFound = (res, msg) => res.status(404).json({ success: false, message: msg || 'Resource not found' });

/** Auth */
const register = async (req, res) => {
  try {
    const { fullName, email, phone, username, password, confirmPassword, dob, ssn } = req.body;
    if (!fullName || !email || !phone || !username || !password || !confirmPassword || !dob || !ssn) {
      return bad(res, 'Missing required fields');
    }
    if (password !== confirmPassword) return bad(res, 'Passwords do not match');

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(409).json({ success: false, message: 'Email or username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      fullName, email, phone, username,
      password: hashedPassword,
      dob, ssn,
      bankName: 'Meta Bank',
      accountType: 'checking',
      accountStatus: 'inactive',
      routingNumber: ROUTING_NUMBER,
      accountNumber: generateAccountNumber(),
      balance: 0,
      availableBalance: 0,
      role: 'user',
      isVerified: false,
      kycStatus: 'pending',
      statements: [],
      investments: [],
      externalAccounts: [],
      iraAccounts: []
    });

    const verificationToken = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    sendVerificationEmail(newUser.email, newUser.fullName, verificationToken).catch(() => {});
    notifyAdminOfNewUser(newUser).catch(() => {});

    return created(res, { success: true, message: 'Account created' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if ((!email && !username) || !password) return bad(res, 'Username/Email and password are required');

    const user = await User.findOne({ $or: [{ username }, { email }] });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role || 'user' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    // Return minimal data; dashboard will fetch full payload via /user/dashboard
    return ok(res, {
      success: true,
      message: 'Login successful',
      token,
      role: user.role || 'user'
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
};

const verifyUser = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return bad(res, 'Missing token');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return notFound(res, 'User not found');
    user.isVerified = true;
    user.accountStatus = 'active';
    await user.save();
    return ok(res, { success: true, message: 'Verified' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/** User */
const profile = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return notFound(res, 'User not found');
  return ok(res, { success: true, user });
};

// FIXED: Return the exact fields your dashboard.html reads
const dashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return notFound(res, 'User not found');

    // Build transactions from Transfer model (if you use Transfer collection)
    const transfers = await Transfer.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean().catch(() => []);
    const transactions = transfers.map(t => ({
      date: t.createdAt || t.date || new Date(),
      description: t.description || (t.type ? t.type : 'Transfer'),
      type: t.status === 'scheduled' ? 'Scheduled' : 'Completed',
      amount: t.amount || 0
    }));

    // Scheduled transfers (status === 'scheduled')
    const scheduled = transfers.filter(t => t.status === 'scheduled').map(t => ({
      date: t.scheduledFor || t.createdAt || new Date(),
      type: 'Scheduled',
      toAccount: t.toAccount || t.toName || '—',
      amount: t.amount || 0,
      status: 'scheduled'
    }));

    // Accounts array for table
    const accounts = [{
      accountType: user.accountType || 'Checking',
      bankName: user.bankName || 'Meta Bank',
      accountNumber: user.accountNumber || 'Not assigned',
      routingNumber: user.routingNumber || ROUTING_NUMBER || 'N/A',
      balance: user.balance || 0,
      availableBalance: user.availableBalance || 0
    }];

    // Analytics
    const totalDeposits = transactions.filter(t => (t.type !== 'Scheduled' && t.amount > 0)).reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalWithdrawals = transactions.filter(t => (t.type !== 'Scheduled' && t.amount < 0)).reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);

    return ok(res, {
      success: true,
      fullName: user.fullName,
      username: user.username || user.fullName,
      accountType: user.accountType || 'Checking',
      bankName: user.bankName || 'Meta Bank',
      accountNumber: user.accountNumber,
      routingNumber: user.routingNumber || ROUTING_NUMBER || 'N/A',
      balance: user.balance || 0,
      availableBalance: user.availableBalance || 0,
      accountStatus: user.accountStatus || 'Inactive',
      kycStatus: user.kycStatus || 'Pending',
      lastLogin: user.lastLogin || new Date().toISOString(),
      accounts,
      transactions,
      transfers: transfers.map(t => ({
        date: t.createdAt || new Date(),
        type: t.type || 'Transfer',
        toAccount: t.toAccount || t.toName || '—',
        amount: t.amount || 0,
        status: t.status || 'completed'
      })),
      analytics: {
        totalDeposits,
        totalWithdrawals,
        history: [
          { label: 'This Week', balance: user.balance || 0 },
          { label: 'Available', balance: user.availableBalance || 0 }
        ]
      }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
};

/** KYC */
const uploadKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return notFound(res, 'User not found');

    const idFront = (req.files?.idFront?.[0]?.filename) || null;
    const idBack = (req.files?.idBack?.[0]?.filename) || null;

    if (!idFront || !idBack) return bad(res, 'Missing ID images');
    user.kycStatus = 'under_review';
    user.kycDocs = {
      idFront: `/uploads/${idFront}`,
      idBack: `/uploads/${idBack}`
    };
    await user.save();

    return ok(res, { success: true, message: 'KYC uploaded', kycStatus: user.kycStatus, kycDocs: user.kycDocs });
  } catch (err) {
    console.error('KYC upload error:', err);
    return res.status(500).json({ success: false, message: 'KYC upload failed' });
  }
};

const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('isVerified kycStatus accountStatus');
    if (!user) return notFound(res, 'User not found');
    return ok(res, { success: true, verification: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch verification status' });
  }
};

const approveKYC = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res, 'User not found');
    user.kycStatus = 'approved';
    user.accountStatus = 'active';
    await user.save();
    return ok(res, { success: true, message: 'KYC approved' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to approve KYC' });
  }
};

const rejectKYC = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res, 'User not found');
    user.kycStatus = 'rejected';
    await user.save();
    return ok(res, { success: true, message: 'KYC rejected' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to reject KYC' });
  }
};

/** Business */
const registerBusinessAccount = async (req, res) => {
  try {
    const einLetter = (req.files?.einLetter?.[0]?.filename) || null;
    const certOrArticles = (req.files?.certOrArticles?.[0]?.filename) || null;
    if (!einLetter || !certOrArticles) return bad(res, 'Missing required documents');

    const user = await User.findById(req.user.id);
    if (!user) return notFound(res, 'User not found');

    user.businessDocs = {
      einLetter: `/uploads/${einLetter}`,
      certOrArticles: `/uploads/${certOrArticles}`
    };
    user.accountType = 'business';
    await user.save();

    return ok(res, { success: true, message: 'Business account registered', accountType: user.accountType, businessDocs: user.businessDocs });
  } catch (err) {
    console.error('Business register error:', err);
    return res.status(500).json({ success: false, message: 'Failed to register business account' });
  }
};

/** Loans */
const applyLoan = async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return bad(res, 'Invalid amount');
    const loan = await Loan.create({ userId: req.user.id, amount, status: 'pending' });
    return created(res, { success: true, loan });
  } catch (err) {
    console.error('Apply loan error:', err);
    return res.status(500).json({ success: false, message: 'Loan application failed' });
  }
};

const getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ userId: req.user.id });
    return ok(res, { success: true, loans });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch loans' });
  }
};

/** Transfers */
const makeTransfer = async (req, res) => {
  try {
    const { toAccount, toName, amount, scheduleDate } = req.body;
    const amt = Number(amount);
    if (!toAccount || !toName || !amt || amt <= 0) return bad(res, 'Missing transfer fields');

    const user = await User.findById(req.user.id);
    if (!user) return notFound(res, 'User not found');

    if (user.availableBalance < amt) return bad(res, 'Insufficient available balance');

    const status = scheduleDate ? 'scheduled' : 'completed';

    // If immediate transfer, deduct balance
    if (!scheduleDate) {
      user.balance = Number(user.balance) - amt;
      user.availableBalance = Number(user.availableBalance) - amt;
      await user.save();
    }

    const transfer = await Transfer.create({
      userId: req.user.id,
      fromAccount: user.accountNumber,
      toAccount,
      toName,
      amount: amt,
      status,
      scheduledFor: scheduleDate || null,
      description: `Transfer to ${toName}`
    });

    return created(res, { success: true, transfer });
  } catch (err) {
    console.error('Make transfer error:', err);
    return res.status(500).json({ success: false, message: 'Transfer failed' });
  }
};

const getTransfers = async (req, res) => {
  try {
    const transfers = await Transfer.find({ userId: req.user.id }).sort({ createdAt: -1 });
    return ok(res, { success: true, transfers });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch transfers' });
  }
};

const completeTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return notFound(res, 'Transfer not found');
    if (transfer.status !== 'scheduled') return bad(res, 'Transfer is not scheduled');

    const user = await User.findById(transfer.userId);
    if (!user) return notFound(res, 'User not found');
    if (user.availableBalance < transfer.amount) return bad(res, 'Insufficient funds');

    user.balance = Number(user.balance) - transfer.amount;
    user.availableBalance = Number(user.availableBalance) - transfer.amount;
    await user.save();

    transfer.status = 'completed';
    await transfer.save();

    return ok(res, { success: true, message: 'Transfer completed', transfer });
  } catch (err) {
    console.error('Complete transfer error:', err);
    return res.status(500).json({ success: false, message: 'Failed to complete transfer' });
  }
};

/** Statements */
const getStatements = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('statements');
    if (!user) return notFound(res, 'User not found');
    return ok(res, { success: true, statements: user.statements || [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch statements' });
  }
};

/** Investments */
const getInvestments = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('investments');
    if (!user) return notFound(res, 'User not found');
    return ok(res, { success: true, investments: user.investments || [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch investments' });
  }
};

/** External Accounts */
const getExternalAccounts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('externalAccounts');
    if (!user) return notFound(res, 'User not found');
    return ok(res, { success: true, externalAccounts: user.externalAccounts || [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch external accounts' });
  }
};

/** IRA Accounts */
const getIraAccounts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('iraAccounts');
    if (!user) return notFound(res, 'User not found');
    return ok(res, { success: true, iraAccounts: user.iraAccounts || [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch IRA accounts' });
  }
};

/** Admin Analytics */
const analytics = async (_req, res) => {
  try {
    const users = await User.find();
    const totalBalance = users.reduce((sum, u) => sum + Number(u.balance || 0), 0);
    const totalUsers = users.length;
    return ok(res, { success: true, totalUsers, totalBalance });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

/** Admin Users */
const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find().select('-password');
    return ok(res, { success: true, users });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

const changeUserRole = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return notFound(res, 'User not found');
    user.role = req.body.role || user.role;
    await user.save();
    return ok(res, { success: true, message: 'Role updated', role: user.role });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to change role' });
  }
};

const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return ok(res, { success: true, message: 'User deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

/** Tickets */
const getOpenTickets = async (_req, res) => {
  try {
    const tickets = await Ticket.find({ status: 'open' });
    return ok(res, { success: true, tickets });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

const resolveTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return notFound(res, 'Ticket not found');
    ticket.status = 'resolved';
    await ticket.save();
    return ok(res, { success: true, message: 'Ticket resolved' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to resolve ticket' });
  }
};

module.exports = {
  register,
  login,
  verifyUser,
  profile,
  dashboard,
  uploadKYC,
  getVerificationStatus,
  approveKYC,
  rejectKYC,
  registerBusinessAccount,
  applyLoan,
  getLoans,
  makeTransfer,
  getTransfers,
  completeTransfer,
  getStatements,
  getInvestments,
  getExternalAccounts,
  getIraAccounts,
  analytics,
  getAllUsers,
  changeUserRole,
  deleteUser,
  getOpenTickets,
  resolveTicket
};
