const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Loan, Transfer, Ticket } = require('./models');
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
    const body = req.body || {};
    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const username = String(body.username || '').trim().toLowerCase();
    const password = String(body.password || '').trim();
    const confirmPassword = String(body.confirmPassword || '').trim();
    const dob = String(body.dob || '').trim();
    const ssn = String(body.ssn || '').trim();
    const bankName = String(body.bankName || 'Meta Bank').trim();
    const accountType = String(body.accountType || 'checking').trim().toLowerCase();

    if (!fullName || !email || !phone || !username || !password || !confirmPassword || !dob || !ssn) {
      return bad(res, 'Missing required fields');
    }
    if (password !== confirmPassword) return bad(res, 'Passwords do not match');

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) return res.status(409).json({ success: false, message: 'Email or username already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const dobDate = isNaN(Date.parse(dob)) ? null : new Date(dob);

    const newUser = await User.create({
      fullName, email, phone, username,
      password: hashedPassword,
      dob: dobDate || dob,
      ssn,
      bankName,
      isVerified: false,
      kycStatus: 'pending',
      accountType,
      accountStatus: 'inactive',
      routingNumber: ROUTING_NUMBER,
      accountNumber: generateAccountNumber(accountType === 'business' ? 'BA' : ''),
      balance: 0.00,
      availableBalance: 0.00,
      isSeeded: false
    });

    const verificationToken = jwt.sign(
      { id: newUser._id, role: newUser.role || 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );
    sendVerificationEmail(newUser.email, newUser.fullName, verificationToken).catch(() => {});
    notifyAdminOfNewUser(newUser).catch(() => {});

    return created(res, {
      success: true,
      message: 'Account created successfully. Verification email sent.',
      user: {
        id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        bankName: newUser.bankName,
        accountType: newUser.accountType,
        accountStatus: newUser.accountStatus,
        kycStatus: newUser.kycStatus,
        isVerified: newUser.isVerified,
        accountNumber: newUser.accountNumber,
        routingNumber: newUser.routingNumber,
        balance: newUser.balance,
        availableBalance: newUser.availableBalance
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();
    if ((!email && !username) || !password) return bad(res, 'Username/Email and password are required');

    const user = await User.findOne({ $or: [{ username }, { email }] });
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role || 'user' }, process.env.JWT_SECRET, { expiresIn: '1d' });
    return ok(res, {
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role || 'user',
        isVerified: user.isVerified,
        bankName: user.bankName,
        accountType: user.accountType,
        accountStatus: user.accountStatus,
        kycStatus: user.kycStatus,
        accountNumber: user.accountNumber,
        routingNumber: user.routingNumber || ROUTING_NUMBER,
        balance: user.balance ?? 0,
        availableBalance: user.availableBalance ?? 0
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
};

/** The rest of your controllers (verifyUser, profile, dashboard, KYC, business, loans, transfers, admin) remain unchanged from your last version. */
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

  // admin
  analytics,
  getAllUsers,
  changeUserRole,
  deleteUser,
  getOpenTickets,
  resolveTicket
};
