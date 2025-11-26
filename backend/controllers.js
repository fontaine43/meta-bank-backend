const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Loan, Transfer, Ticket } = require('./models');
const { sendVerificationEmail, notifyAdminOfNewUser, generateAccountNumber, ROUTING_NUMBER, seedDisplayBalance } = require('./utils');

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
      // keep 0 balances for new users
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

    const verificationToken = jwt.sign({ id: newUser._id, role: newUser.role || 'user' }, process.env.JWT_SECRET, { expiresIn: '1d' });
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
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '').trim();
    if (!username || !password) return bad(res, 'Username and password are required');

    const user = await User.findOne({ $or: [{ username }, { email: username }] });
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

    // Mark email verified. Keep account inactive until KYC is approved and ID docs exist.
    user.isVerified = true;
    user.accountStatus = (user.kycStatus === 'approved' && user.idFront && user.idBack) ? 'active' : 'inactive';
    user.routingNumber = ROUTING_NUMBER;
    user.balance = user.isSeeded ? seedDisplayBalance(user.accountType) : 0.00;
    user.availableBalance = user.balance;

    user.verificationToken = undefined;
    user.verificationTokenExpiry = undefined;

    await user.save();

    return ok(res, {
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        accountNumber: user.accountNumber,
        routingNumber: user.routingNumber,
        balance: user.balance,
        availableBalance: user.availableBalance,
        accountType: user.accountType,
        accountStatus: user.accountStatus,
        kycStatus: user.kycStatus
      }
    });
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
    const transactions = transfers; // same list for now

    const analytics = { totalDeposits: 0, totalWithdrawals: 0 };

    return ok(res, {
      success: true,
      username: user.username,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      dob: user.dob,
      address: user.address || 'Not provided',
      kycStatus: user.kycStatus || 'pending',
      accountStatus: user.accountStatus || 'inactive',
      accountType: user.accountType || 'checking',
      bankName: user.bankName || 'Meta Bank',
      accountNumber: user.accountNumber || 'Not assigned',
      routingNumber: user.routingNumber || ROUTING_NUMBER,
      balance: displayBalance,
      availableBalance: displayAvailable,
      transactions,
      transfers,
      analytics,
      lastLogin: user.lastLogin
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Dashboard fetch failed' });
  }
};

/** KYC */
const uploadKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return notFound(res, 'User not found');

    const idFrontFile = req.files?.idFront?.[0];
    const idBackFile = req.files?.idBack?.[0];
    if (!idFrontFile || !idBackFile) return bad(res, 'Both ID front and back images are required');

    user.idFront = idFrontFile.filename;
    user.idBack = idBackFile.filename;
    user.kycStatus = 'pending';
    await user.save();

    return ok(res, { success: true, message: 'KYC documents uploaded successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Upload failed' });
  }
};

const getVerificationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('isVerified kycStatus accountStatus idFront idBack');
    if (!user) return notFound(res, 'User not found');
    return ok(res, { success: true, verification: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch verification status' });
  }
};

const approveKYC = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 'Invalid user ID');

    const user = await User.findById(id);
    if (!user) return notFound(res, 'User not found');

    user.kycStatus = 'approved';
    // Activate only if email verified and docs exist
    user.accountStatus = (user.isVerified && user.idFront && user.idBack) ? 'active' : 'inactive';
    await user.save();

    return ok(res, { success: true, message: 'KYC approved', user: { id: user._id, kycStatus: user.kycStatus, accountStatus: user.accountStatus } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to approve KYC' });
  }
};

const rejectKYC = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 'Invalid user ID');

    const user = await User.findById(id);
    if (!user) return notFound(res, 'User not found');

    user.kycStatus = 'rejected';
    user.accountStatus = 'inactive';
    await user.save();

    return ok(res, { success: true, message: 'KYC rejected' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to reject KYC' });
  }
};

/** Business account */
const registerBusinessAccount = async (req, res) => {
  try {
    const { businessName, dba, ein, businessAddress, businessEmail, businessPhone } = req.body;
    if (!businessName || !dba || !ein || !businessAddress || !businessEmail || !businessPhone) {
      return bad(res, 'All business account fields are required');
    }

    const user = await User.findById(req.user.id);
    if (!user) return notFound(res, 'User not found');

    user.businessName = businessName;
    user.dba = dba;
    user.ein = ein;
    user.businessAddress = businessAddress;
    user.businessEmail = businessEmail;
    user.businessPhone = businessPhone;
    user.accountType = 'business';

    user.einLetter = req.files?.einLetter?.[0]?.filename || user.einLetter;
    user.certOrArticles = req.files?.certOrArticles?.[0]?.filename || user.certOrArticles;

    user.routingNumber = ROUTING_NUMBER;
    user.accountNumber = user.accountNumber || generateAccountNumber('BA');
    user.balance = user.isSeeded ? seedDisplayBalance('business') : 0.00;
    user.availableBalance = user.balance;

    await user.save();

    return created(res, {
      success: true,
      message: 'Business account created successfully. Please verify email and complete KYC to activate.',
      accountNumber: user.accountNumber,
      routingNumber: user.routingNumber
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to register business account' });
  }
};

/** Loans */
const applyLoan = async (req, res) => {
  try {
    const { type = 'personal', amount, purpose } = req.body;
    if (!amount || !purpose) return bad(res, 'Amount and purpose are required');

    const loan = await Loan.create({
      userId: req.user.id,
      type: type.toLowerCase() === 'business' ? 'business' : 'personal',
      amount,
      purpose,
      status: 'pending',
      appliedAt: new Date()
    });

    return created(res, { success: true, message: 'Loan application submitted', loan });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to apply for loan' });
  }
};

const getLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ userId: req.user.id }).sort({ appliedAt: -1 });
    return ok(res, { success: true, loans });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch loans' });
  }
};

/** Transfers */
const makeTransfer = async (req, res) => {
  try {
    const { toAccount, amount, type, notes } = req.body;
    if (!toAccount || !amount) return bad(res, 'Destination account and amount are required');

    const transfer = await Transfer.create({
      userId: req.user.id,
      toAccount,
      amount,
      type,
      notes,
      status: 'pending',
      initiatedAt: new Date()
    });

    return created(res, { success: true, message: 'Transfer initiated', transfer });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to initiate transfer' });
  }
};

const completeTransfer = async (req, res) => {
  try {
    const transfer = await Transfer.findById(req.params.id);
    if (!transfer) return notFound(res, 'Transfer not found');
    transfer.status = 'completed';
    transfer.completedAt = new Date();
    transfer.processedBy = req.user.id;
    await transfer.save();
    return ok(res, { success: true, message: 'Transfer completed', transfer });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to complete transfer' });
  }
};

const getTransfers = async (req, res) => {
  try {
    const transfers = await Transfer.find({ userId: req.user.id }).sort({ initiatedAt: -1 });
    return ok(res, { success: true, transfers });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch transfers' });
  }
};

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
  } catch {
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
  } catch {
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
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

const getOpenTickets = async (_req, res) => {
  try {
    const tickets = await Ticket.find({ status: 'open' }).sort({ createdAt: -1 }).lean();
    return ok(res, tickets);
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to fetch tickets' });
  }
};

const resolveTicket = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return bad(res, 'Invalid ticket ID');
    const ticket = await Ticket.findByIdAndUpdate(id, { status: 'resolved', resolvedAt: new Date(), resolvedBy: req.user.id }, { new: true }).lean();
    if (!ticket) return notFound(res, 'Ticket not found');
    return ok(res, { success: true, message: 'Ticket resolved', ticket });
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to resolve ticket' });
  }
};

module.exports = {
  // auth
  register, login, verifyUser,
  // user
  profile, dashboard,
  // kyc
  uploadKYC, getVerificationStatus, approveKYC, rejectKYC,
  // business
  registerBusinessAccount,
  // loans
  applyLoan, getLoans,
  // transfers
  makeTransfer, completeTransfer, getTransfers,
  // admin
  analytics, getAllUsers, changeUserRole, deleteUser, getOpenTickets, resolveTicket
};
