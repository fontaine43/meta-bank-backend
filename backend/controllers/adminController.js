const User = require('../models/User');
const Ticket = require('../models/Ticket');

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Change user role
const changeUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    await User.findByIdAndUpdate(req.params.id, { role });
    res.json({ message: 'User role updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

// Get open tickets
const getOpenTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ status: 'open' });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
};

// Resolve ticket
const resolveTicket = async (req, res) => {
  try {
    await Ticket.findByIdAndUpdate(req.params.id, { status: 'resolved' });
    res.json({ message: 'Ticket resolved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve ticket' });
  }
};

module.exports = {
  getAllUsers,
  changeUserRole,
  deleteUser,
  getOpenTickets,
  resolveTicket
};
