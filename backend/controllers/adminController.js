const User = require('../models/User');
const Ticket = require('../models/Ticket');
const Loan = require('../models/Loan');

// =======================
// Analytics & Stats
// =======================
const getStats = async (req, res) => {
  try {
    const users = await User.countDocuments();
    const pendingKYC = await User.countDocuments({ kycStatus: 'Pending' });
    const activeLoans = await Loan.countDocuments({ status: 'Active' });
    const openTickets = await Ticket.countDocuments({ status: 'open' });

    res.json({ users, pendingKYC, activeLoans, openTickets });
  } catch (err) {
    console.error('❌ Stats fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// =======================
// User Management
// =======================
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    console.error('❌ Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    await User.findByIdAndUpdate(req.params.id, { role });
    res.json({ message: 'User role updated' });
  } catch (err) {
    console.error('❌ Update role error:', err);
    res.status(500).json({ error: 'Failed to update role' });
  }
};

const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('❌ Delete user error:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

const promoteUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { role: 'Admin' });
    res.json({ message: 'User promoted to Admin' });
  } catch (err) {
    console.error('❌ Promote user error:', err);
    res.status(500).json({ error: 'Failed to promote user' });
  }
};

const suspendUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isVerified: false });
    res.json({ message: 'User suspended' });
  } catch (err) {
    console.error('❌ Suspend user error:', err);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
};

// =======================
// KYC Approvals
// =======================
const getPendingKYC = async (req, res) => {
  try {
    const users = await User.find({ kycStatus: 'Pending' }).select('-password');
    res.json(users);
  } catch (err) {
    console.error('❌ Fetch KYC error:', err);
    res.status(500).json({ error: 'Failed to fetch pending KYC' });
  }
};

const approveKYC = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { kycStatus: 'Approved' });
    res.json({ message: 'KYC approved' });
  } catch (err) {
    console.error('❌ Approve KYC error:', err);
    res.status(500).json({ error: 'Failed to approve KYC' });
  }
};

const rejectKYC = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { kycStatus: 'Rejected' });
    res.json({ message: 'KYC rejected' });
  } catch (err) {
    console.error('❌ Reject KYC error:', err);
    res.status(500).json({ error: 'Failed to reject KYC' });
  }
};

// =======================
// Support Tickets
// =======================
const getOpenTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ status: 'open' });
    res.json(tickets);
  } catch (err) {
    console.error('❌ Fetch tickets error:', err);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

const resolveTicket = async (req, res) => {
  try {
    await Ticket.findByIdAndUpdate(req.params.id, { status: 'resolved' });
    res.json({ message: 'Ticket resolved' });
  } catch (err) {
    console.error('❌ Resolve ticket error:', err);
    res.status(500).json({ error: 'Failed to resolve ticket' });
  }
};

module.exports = {
  getStats,
  getAllUsers,
  changeUserRole,
  deleteUser,
  promoteUser,
  suspendUser,
  getPendingKYC,
  approveKYC,
  rejectKYC,
  getOpenTickets,
  resolveTicket
};
