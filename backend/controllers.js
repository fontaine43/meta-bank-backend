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
  ROUTING_NUMBER
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

    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (username) {
      user = await User.findOne({ username });
    }

    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role || 'user' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

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

const dashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return notFound(res, 'User not found');

    const transfers = await Transfer.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean().catch(() => []);
    const transactions = transfers.map(t => ({
      date: t.createdAt || t.date || new Date(),
      description: t.description || (t.type ? t.type : 'Transfer'),
      type: t.status === 'scheduled' ? 'Scheduled' : 'Completed',
      amount: t.amount || 0
    }));

    const accounts = [{
      accountType: user.accountType || 'Checking',
      bankName: user.bankName || 'Meta Bank',
      accountNumber: user.accountNumber || 'Not assigned',
      routingNumber: user.routingNumber || ROUTING_NUMBER || 'N/A',
      balance: user.balance || 0,
      availableBalance: user.availableBalance || 0
    }];

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
const uploadKYC = async (req, res) => { /* ...same as before... */ };
const getVerificationStatus = async (req, res) => { /* ...same as before... */ };
const approveKYC = async (req, res) => { /* ...same as before... */ };
const rejectKYC = async (req, res) => { /* ...same as before... */ };

/** Business */
const registerBusinessAccount = async (req, res) => { /* ...same as before... */ };

/** Loans */
const applyLoan = async (req, res) => { /* ...same as before... */ };
const getLoans = async (req, res) => { /* ...same as before... */ };

/** Transfers */
const makeTransfer = async (req, res) => { /* ...same as before... */ };
const getTransfers = async (req, res) => { /* ...same as before... */ };
const completeTransfer = async (req, res) => { /* ...same as before... */ };

/** Statements / Investments / External / IRA */
const getStatements = async (req, res) => { /* ...same as before... */ };
const getInvestments = async (req, res) => { /* ...same as before... */ };
const getExternalAccounts = async (req, res) => { /* ...same as before... */ };
const getIraAccounts = async (req, res) => { /* ...same as before... */ };

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

/** Exports */
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
