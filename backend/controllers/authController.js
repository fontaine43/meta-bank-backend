const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendVerificationEmail, notifyAdminOfNewUser } = require('../utils/email');

// ✅ REGISTER CONTROLLER
const register = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      username,
      password,
      confirmPassword,
      dob,
      ssn,
      bankName
    } = req.body;

    if (!fullName || !email || !phone || !username || !password || !confirmPassword || !dob || !ssn || !bankName) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const idFront = req.files?.idFront?.[0]?.filename || '';
    const idBack = req.files?.idBack?.[0]?.filename || '';

    const newUser = new User({
      fullName,
      email,
      phone,
      username,
      password: hashedPassword,
      dob,
      ssn,
      bankName,
      idFront,
      idBack,
      isVerified: false,
      kycStatus: 'Pending'
    });

    await newUser.save();

    const verificationToken = jwt.sign({ id: newUser._id, role: newUser.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    // Send verification email and notify admin (non-blocking)
    sendVerificationEmail(newUser.email, newUser.fullName, verificationToken).catch(console.error);
    notifyAdminOfNewUser(newUser).catch(console.error);

    // ✅ Final response for frontend
    res.status(201).json({
      success: true,
      message: 'Account created successfully. Redirecting to login...',
      token: verificationToken
    });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ success: false, message: 'Registration failed', details: err.message });
  }
};

// ✅ LOGIN CONTROLLER
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role || 'user',
        isVerified: user.isVerified
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed', details: err.message });
  }
};

module.exports = { register, login };
