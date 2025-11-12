const User = require('../models/User');
const Loan = require('../models/Loan');
const Transfer = require('../models/Transfer');

exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
};

exports.applyLoan = async (req, res) => {
  const loan = new Loan({ ...req.body, userId: req.user.id });
  await loan.save();
  res.json({ message: 'Loan application submitted' });
};

exports.makeTransfer = async (req, res) => {
  const transfer = new Transfer({ ...req.body, userId: req.user.id });
  await transfer.save();
  res.json({ message: 'Transfer initiated' });
};

exports.getLoans = async (req, res) => {
  const loans = await Loan.find({ userId: req.user.id });
  res.json(loans);
};

exports.getTransfers = async (req, res) => {
  const transfers = await Transfer.find({ userId: req.user.id });
  res.json(transfers);
};
