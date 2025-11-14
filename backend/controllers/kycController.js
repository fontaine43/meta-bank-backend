console.log('✅ kycController.js loaded'); // Diagnostic log

const User = require('../models/User');

// ✅ Upload KYC documents
const uploadKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const idFrontFile = req.files?.idFront?.[0];
    const idBackFile = req.files?.idBack?.[0];

    if (!idFrontFile || !idBackFile) {
      return res.status(400).json({ error: 'Both ID front and back images are required' });
    }

    user.idFront = idFrontFile.filename;
    user.idBack = idBackFile.filename;
    user.kycStatus = 'pending';

    await user.save();
    res.status(200).json({ message: 'KYC documents uploaded successfully' });
  } catch (err) {
    console.error('❌ KYC upload error:', err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
};

// ✅ Get all users with pending KYC
const getPendingKYC = async (req, res) => {
  try {
    const users = await User.find({ kycStatus: 'pending' }).select('-password');
    res.status(200).json(users);
  } catch (err) {
    console.error('❌ Fetch pending KYC error:', err);
    res.status(500).json({ error: 'Failed to fetch pending KYC users', details: err.message });
  }
};

// ✅ Approve KYC
const approveKYC = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { kycStatus: 'approved' },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'KYC approved' });
  } catch (err) {
    console.error('❌ Approve KYC error:', err);
    res.status(500).json({ error: 'Failed to approve KYC', details: err.message });
  }
};

// ✅ Reject KYC
const rejectKYC = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { kycStatus: 'rejected' },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ message: 'KYC rejected' });
  } catch (err) {
    console.error('❌ Reject KYC error:', err);
    res.status(500).json({ error: 'Failed to reject KYC', details: err.message });
  }
};

module.exports = {
  uploadKYC,
  getPendingKYC,
  approveKYC,
  rejectKYC
};
