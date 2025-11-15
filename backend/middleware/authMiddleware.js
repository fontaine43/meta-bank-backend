const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ✅ Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing or malformed token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // decoded should include user id and role
    next();
  } catch (err) {
    console.error('❌ Token verification error:', err.message);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// ✅ Middleware to check if user is Admin
const isAdmin = async (req, res, next) => {
  try {
    // If JWT payload already has role, use it directly
    if (req.user && req.user.role === 'Admin') {
      return next();
    }

    // Otherwise, fetch from DB to confirm
    const user = await User.findById(req.user.id);
    if (user && user.role === 'Admin') {
      return next();
    }

    return res.status(403).json({ message: 'Access denied: Admins only' });
  } catch (err) {
    console.error('❌ Admin check error:', err.message);
    res.status(500).json({ message: 'Server error checking admin role' });
  }
};

// ✅ Export both for destructuring
module.exports = {
  verifyToken,
  isAdmin
};
