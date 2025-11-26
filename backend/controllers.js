const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ✅ Direct imports of your model files
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
      dob,
      ssn,
      bankName: 'Meta Bank',
      accountType: 'checking',
      accountStatus: 'inactive',
      routingNumber: ROUTING_NUMBER,
      accountNumber: generateAccountNumber(),
      balance: 0,
      availableBalance: 0,
      isVerified: false,
      kycStatus: 'pending'
    });

    const verificationToken = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    sendVerificationEmail(newUser.email, newUser.fullName, verificationToken).catch(() => {});
    notifyAdminOfNewUser(newUser).catch(() => {});

    return created(res, { success: true, message: 'Account created', user: newUser });
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

    const token = jwt.sign({ id: user._id, role: user.role || 'user' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return ok(res, { success: true, message: 'Login successful', token, user });
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
    await user.save();
    return ok(res, { success: true, message: 'Verified', user });
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
  const user = await User.findById(req.user.id).lean();
  if (!user) return notFound(res, 'User not found');
  return ok(res, { success: true, dashboard: { balance: user.balance, transfers: [] } });
};

/** KYC */
const uploadKYC = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return notFound(res, 'User not found');
  user.kycStatus = 'pending';
  await user.save();
  return ok(res, { success: true, message: 'KYC uploaded' });
};

const getVerificationStatus = async (req, res) => {
  const user = await User.findById(req.user.id).select('isVerified kycStatus accountStatus');
  if (!user) return notFound(res, 'User not found');
  return ok(res, { success: true, verification: user });
};

const approveKYC = async (req, res) => ok(res, { success: true, message: 'KYC approved' });
const rejectKYC = async (req, res) => ok(res, { success: true, message: 'KYC rejected' });

/** Business */
const registerBusinessAccount = async (req, res) => ok(res, { success: true, message: 'Business account registered' });

/** Loans */
const applyLoan = async (req, res) => {
  const loan = await Loan.create({ userId: req.user.id, amount: req.body.amount, status: 'pending' });
  return created(res, { success: true, loan });
};
const getLoans = async (req, res) => {
  const loans = await Loan.find({ userId: req.user.id });
  return ok(res, { success: true, loans });
};

/** Transfers */
const makeTransfer = async (req, res) => {
  const transfer = await Transfer.create({ userId: req.user.id, amount: req.body.amount, status: 'pending' });
  return created(res, { success: true, transfer });
};
const getTransfers = async (req, res) => {
  const transfers = await Transfer.find({ userId: req.user.id });
  return ok(res, { success: true, transfers });
};
const completeTransfer = async (req, res) => ok(res, { success: true, message: 'Transfer completed' });

/** Extra User Features */
const getStatements = async (req, res) => {
  const user = await User.findById(req.user.id).select('statements');
  if (!user) return notFound(res, 'User not found');
  return ok(res, { success: true, statements: user.statements });
};

const getInvestments = async (req, res) => {
  const user = await User.findById(req.user.id).select('investments');
  if (!user) return notFound(res, 'User not found');
  return ok(res, { success: true, investments: user.investments });
};

const getExternalAccounts = async (req, res) => {
  const user = await User.findById(req.user.id).select('externalAccounts');
  if (!user) return notFound(res, 'User not found');
  return ok(res, { success: true, externalAccounts: user.externalAccounts });
};

const getIraAccounts = async (req, res) => {
  const user = await User.findById(req.user.id).select('iraAccounts');
  if (!user) return notFound(res, 'User not found');
  return ok(res, { success: true, iraAccounts: user.iraAccounts });
};

/** Admin */
const analytics = async (_req, res) => ok(res, { success: true, stats: {} });
const getAllUsers = async (_req, res) => {
  const users = await User.find({}).select('-password');
  return ok(res, { success: true, users });
};
const changeUserRole = async (req, res) => ok(res, { success: true, message: 'Role changed' });
const deleteUser = async (req, res) => ok(res, { success: true, message: 'User deleted' });
const getOpenTickets = async (_req, res) => {
  const tickets = await Ticket.find({ status: 'open' });
  return ok(res, { success: true, tickets });
};
const resolveTicket = async (req, res) => ok(res, { success: true, message: 'Ticket resolved' });

/** Export all controllers */
module.exports = {
  // auth
  register,
  login,
  verifyUser,
  profile,
  dashboard,

  // kyc
  uploadKYC,
  getVerificationStatus,
  approveKYC,
  rejectKYC,

  // business
  registerBusinessAccount,

  // loans
  applyLoan,
  getLoans,

  // transfers
  makeTransfer,
  getTransfers,
  completeTransfer,

  // extra user features
  getStatements,
  getInvestments,
  getExternalAccounts,
  getIraAccounts,

  // admin
  analytics,
  getAllUsers,
  changeUserRole,
  deleteUser,
  getOpenTickets,
  resolveTicket
};
