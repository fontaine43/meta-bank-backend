const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyUser = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: 'Missing verification token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(200).json({ message: 'User already verified' });
    }

    user.isVerified = true;
    await user.save();

    res.status(200).json({ message: 'Account verified successfully' });
  } catch (err) {
    console.error('❌ Verification error:', err);
    res.status(500).json({ message: 'Verification failed', details: err.message });
  }
};

module.exports = { verifyUser };
