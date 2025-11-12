const User = require('../models/User');
const path = require('path');
const fs = require('fs');

exports.uploadKYC = async (req, res) => {
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

exports.getPendingKYC = async (req, res) => {
  const pendingUsers = await User.find({ kycStatus: 'pending' });
  res.json(pendingUsers);
};

exports.approveKYC = async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { kycStatus: 'approved' });
  res.json({ message: 'KYC approved' });
};

exports.rejectKYC = async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { kycStatus: 'rejected' });
  res.json({ message: 'KYC rejected' });
};
