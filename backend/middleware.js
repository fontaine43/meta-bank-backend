const jwt = require('jsonwebtoken');
const { User } = require('./models');

const verifyToken = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return res.status(401).json({ success: false, message: 'Missing or malformed token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id, role: (decoded.role || 'user').toLowerCase() };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(403).json({ success: false, message: 'Token expired' });
    }
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    if (req.user?.role === 'admin') return next();
    const user = await User.findById(req.user.id).select('role');
    if (user && user.role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Access denied: Admins only' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error checking admin role' });
  }
};

module.exports = { verifyToken, isAdmin };
