const User = require('../models/User');

const uploadKYC = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

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
    console.error('❌ uploadKYC error:', err);
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
};

const getPendingKYC = async (req, res) => {
  try {
    const users = await User.find({ kycStatus: 'pending' }).select('-password');
    res.status(200).json(users);
  } catch (err) {
    console.error('❌ getPendingKYC error:', err);
    res.status(500).json({ error: 'Failed to fetch pending KYC users', details: err.message });
  }
};

const approveKYC = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { kycStatus: 'approved' }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: 'KYC approved' });
  } catch (err) {
    console.error('❌ approveKYC error:', err);
    res.status(500).json({ error: 'Failed to approve KYC', details: err.message });
  }
};

const rejectKYC = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { kycStatus: 'rejected' }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: 'KYC rejected' });
  } catch (err) {
    console.error('❌ rejectKYC error:', err);
    res.status(500).json({ error: 'Failed to reject KYC', details: err.message });
  }
};

console.log('✅ kycController.js loaded');

module.exports = {
  uploadKYC,
  getPendingKYC,
  approveKYC,
  rejectKYC
};
