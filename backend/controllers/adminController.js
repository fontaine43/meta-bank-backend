const User = require('../models/User');
const Ticket = require('../models/Ticket');

exports.getAllUsers = async (req, res) => {
  const users = await User.find();
  res.json(users);
};

exports.changeUserRole = async (req, res) => {
  const { role } = req.body;
  await User.findByIdAndUpdate(req.params.id, { role });
  res.json({ message: 'User role updated' });
};

exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
};

exports.getOpenTickets = async (req, res) => {
  const tickets = await Ticket.find({ status: 'open' });
  res.json(tickets);
};

exports.resolveTicket = async (req, res) => {
  await Ticket.findByIdAndUpdate(req.params.id, { status: 'resolved' });
  res.json({ message: 'Ticket resolved' });
};
