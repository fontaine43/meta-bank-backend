const User = require('../models/User');
const path = require('path');
const fs = require('fs');

// Upload KYC documents
const uploadKYC = async (req, res) => {
  try {
    const { id } = req.user;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.idFront = req.files?.idFront?.[0]?.filename || '';
    user.idBack = req.files?.idBack?.[0]?.filename || '';
    user.kycStatus = 'pending';

    await user.save();
    res.json({ message: 'KYC documents uploaded' });
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
};

// Get all users with pending KYC
const getPendingKYC = async (req, res) => {
  try {
    const pendingUsers = await User.find({ kycStatus: 'pending' });
    res.json(pendingUsers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch pending KYC users' });
  }
};

// Approve KYC
const approveKYC = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { kycStatus: 'approved' });
    res.json({ message: 'KYC approved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve KYC' });
  }
};

// Reject KYC
const rejectKYC = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { kycStatus: 'rejected' });
    res.json({ message: 'KYC rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject KYC' });
  }
};

module.exports = {
  uploadKYC,
  getPendingKYC,
  approveKYC,
  rejectKYC
};
