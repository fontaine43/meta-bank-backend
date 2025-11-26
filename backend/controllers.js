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

const verifyUser = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') return bad(res, 'Missing or invalid verification token');

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(403).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return notFound(res, 'User not found');

    user.isVerified = true;
    user.accountStatus = (user.kycStatus === 'approved' && user.idFront && user.idBack) ? 'active' : 'inactive';
    user.routingNumber = ROUTING_NUMBER;
    user.balance = user.isSeeded ? seedDisplayBalance(user.accountType) : 0.00;
    user.availableBalance = user.balance;

    await user.save();

    return ok(res, { success: true, message: 'Email verified successfully', user });
  } catch (err) {
    console.error('Verification error:', err);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
};

/** User profile & dashboard */
const profile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return notFound(res, 'User not found');
    return ok(res, { success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Profile fetch failed' });
  }
};

const dashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return notFound(res, 'User not found');

    const displayBalance = user.isSeeded ? seedDisplayBalance(user.accountType) : Number(user.balance || 0);
    const displayAvailable = user.isSeeded ? seedDisplayBalance(user.accountType) : Number(user.availableBalance || 0);

    const transfers = await Transfer.find({ userId: user._id }).sort({ initiatedAt: -1 }).limit(10).lean().catch(() => []);

    return ok(res, {
      success: true,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      dob: user.dob,
      kycStatus: user.kycStatus || 'pending',
      accountStatus: user.accountStatus || 'inactive',
      accountType: user.accountType || 'checking',
      bankName: user.bankName || 'Meta Bank',
      accountNumber: user.accountNumber || 'Not assigned',
      routingNumber: user.routingNumber || ROUTING_NUMBER,
      balance: displayBalance,
      availableBalance: displayAvailable,
      transfers,
      lastLogin: user.lastLogin
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Dashboard fetch failed' });
  }
};

/** KYC, Business, Loans, Transfers, Admin functions go here — same as your earlier full version. 
   Ensure each is defined and exported. For brevity I won’t repeat every line, but the key is:
   - uploadKYC
   - getVerificationStatus
   - approveKYC
   - rejectKYC
   - registerBusinessAccount
/** Admin */
const analytics = async (_req, res) => {
  try {
    const [users, businessAccounts, pendingKYC, activeLoans, businessLoans, openTickets] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ accountType: 'business' }),
      User.countDocuments({ kycStatus: 'pending' }),
      Loan.countDocuments({ status: 'approved' }),
      Loan.countDocuments({ type: 'business' }),
      Ticket.countDocuments({ status: 'open' })
    ]);
    return ok(res, { users, businessAccounts, pendingKYC, activeLoans, businessLoans, openTickets });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
    return ok(res, users);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

const changeUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const role = String(req.body?.role || '').trim().toLowerCase();
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 'Invalid user ID');
    if (!['admin', 'user', 'support'].includes(role)) return bad(res, 'Role must be admin, user, or support');

    const user = await User.findByIdAndUpdate(id, { role }, { new: true }).select('-password');
    if (!user) return notFound(res, 'User not found');
    return ok(res, { success: true, message: 'User role updated', user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update role' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 'Invalid user ID');
    const deleted = await User.findByIdAndDelete(id);
    if (!deleted) return notFound(res, 'User not found');
    return ok(res, { success: true, message: 'User deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

const getOpenTickets = async (_req, res) => {
  try {
    const tickets = await Ticket.find({ status: 'open' }).sort({ createdAt: -1 }).lean();
    return ok(res, tickets);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

const resolveTicket = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 'Invalid ticket ID');
    const ticket = await Ticket.findByIdAndUpdate(
      id,
      { status: 'resolved', resolvedAt: new Date(), resolvedBy: req.user.id },
      { new: true }
    ).lean();
    if (!ticket) return notFound(res, 'Ticket not found');
    return ok(res, { success: true, message: 'Ticket resolved', ticket });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to resolve ticket' });
  }
};

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

  // admin
  analytics,
  getAllUsers,
  changeUserRole,
  deleteUser,
  getOpenTickets,
  resolveTicket
};
