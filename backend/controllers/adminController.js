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

    res.status(200).json({ users, pendingKYC, activeLoans, openTickets });
  } catch (err) {
    console.error('❌ Stats fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch stats', details: err.message });
  }
};

// =======================
// User Management
// =======================
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (err) {
    console.error('❌ Fetch users error:', err);
    res.status(500).json({ message: 'Failed to fetch users', details: err.message });
  }
};

const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: 'Role is required' });

    await User.findByIdAndUpdate(req.params.id, { role });
    res.status(200).json({ message: 'User role updated' });
  } catch (err) {
    console.error('❌ Update role error:', err);
    res.status(500).json({ message: 'Failed to update role', details: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'User deleted' });
  } catch (err) {
    console.error('❌ Delete user error:', err);
    res.status(500).json({ message: 'Failed to delete user', details: err.message });
  }
};

const promoteUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { role: 'Admin' });
    res.status(200).json({ message: 'User promoted to Admin' });
  } catch (err) {
    console.error('❌ Promote user error:', err);
    res.status(500).json({ message: 'Failed to promote user', details: err.message });
  }
};

const suspendUser = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isVerified: false });
    res.status(200).json({ message: 'User suspended' });
  } catch (err) {
    console.error('❌ Suspend user error:', err);
    res.status(500).json({ message: 'Failed to suspend user', details: err.message });
  }
};

// =======================
// KYC Approvals
// =======================
const getPendingKYC = async (req, res) => {
  try {
    const users = await User.find({ kycStatus: 'Pending' }).select('-password');
    res.status(200).json(users);
  } catch (err) {
    console.error('❌ Fetch KYC error:', err);
    res.status(500).json({ message: 'Failed to fetch pending KYC', details: err.message });
  }
};

const approveKYC = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { kycStatus: 'Approved' });
    res.status(200).json({ message: 'KYC approved' });
  } catch (err) {
    console.error('❌ Approve KYC error:', err);
    res.status(500).json({ message: 'Failed to approve KYC', details: err.message });
  }
};

const rejectKYC = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { kycStatus: 'Rejected' });
    res.status(200).json({ message: 'KYC rejected' });
  } catch (err) {
    console.error('❌ Reject KYC error:', err);
    res.status(500).json({ message: 'Failed to reject KYC', details: err.message });
  }
};

// =======================
// Support Tickets
// =======================
const getOpenTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ status: 'open' });
    res.status(200).json(tickets);
  } catch (err) {
    console.error('❌ Fetch tickets error:', err);
    res.status(500).json({ message: 'Failed to fetch tickets', details: err.message });
  }
};

const resolveTicket = async (req, res) => {
  try {
    await Ticket.findByIdAndUpdate(req.params.id, { status: 'resolved' });
    res.status(200).json({ message: 'Ticket resolved' });
  } catch (err) {
    console.error('❌ Resolve ticket error:', err);
    res.status(500).json({ message: 'Failed to resolve ticket', details: err.message });
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
