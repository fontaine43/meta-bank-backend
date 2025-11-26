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
const register = async (req, res) => { /* … same as before … */ };
const login = async (req, res) => { /* … same as before … */ };

const verifyUser = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') return bad(res, 'Missing or invalid verification token');
    let decoded;
    try { decoded = jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(403).json({ success: false, message: 'Invalid or expired token' }); }
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
const profile = async (req, res) => { /* … same as before … */ };
const dashboard = async (req, res) => { /* … same as before … */ };

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

const getVerificationStatus = async (req, res) => { /* … same as before … */ };
const approveKYC = async (req, res) => { /* … same as before … */ };
const rejectKYC = async (req, res) => { /* … same as before … */ };

/** Business account */
const registerBusinessAccount = async (req, res) => { /* … same as before … */ };

/** Loans */
const applyLoan = async (req, res) => { /* … same as before … */ };
const getLoans = async (req, res) => { /* … same as before … */ };

/** Transfers */
const makeTransfer = async (req, res) => { /* … same as before … */ };
const getTransfers = async (req, res) => { /* … same as before … */ };
const completeTransfer = async (req, res) => { /* … same as before … */ };

/** Admin */
const analytics = async (_req, res) => { /* … same as before … */ };
const getAllUsers = async (_req, res) => { /* … same as before … */ };
const changeUserRole = async (req, res) => { /* … same as before … */ };
const deleteUser = async (req, res) => { /* … same as before … */ };
const getOpenTickets = async (_req, res) => { /* … same as before … */ };
const resolveTicket = async (req, res) => { /* … same as before … */ };

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
