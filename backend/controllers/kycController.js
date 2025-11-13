const User = require('../models/User');
const path = require('path');
const fs = require('fs');

// Upload KYC documents
function uploadKYC(req, res) {
  const { id } = req.user;

  User.findById(id)
    .then(user => {
      if (!user) return res.status(404).json({ error: 'User not found' });

      user.idFront = req.files?.idFront?.[0]?.filename || '';
      user.idBack = req.files?.idBack?.[0]?.filename || '';
      user.kycStatus = 'pending';

      return user.save();
    })
    .then(() => res.json({ message: 'KYC documents uploaded' }))
    .catch(err => res.status(500).json({ error: 'Upload failed', details: err.message }));
}

// Get all users with pending KYC
function getPendingKYC(req, res) {
  User.find({ kycStatus: 'pending' })
    .then(users => res.json(users))
    .catch(err => res.status(500).json({ error: 'Failed to fetch pending KYC users' }));
}

// Approve KYC
function approveKYC(req, res) {
  User.findByIdAndUpdate(req.params.id, { kycStatus: 'approved' })
    .then(() => res.json({ message: 'KYC approved' }))
    .catch(err => res.status(500).json({ error: 'Failed to approve KYC' }));
}

// Reject KYC
function rejectKYC(req, res) {
  User.findByIdAndUpdate(req.params.id, { kycStatus: 'rejected' })
    .then(() => res.json({ message: 'KYC rejected' }))
    .catch(err => res.status(500).json({ error: 'Failed to reject KYC' }));
}

module.exports = {
  uploadKYC,
  getPendingKYC,
  approveKYC,
  rejectKYC
};
