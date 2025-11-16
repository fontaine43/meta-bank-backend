const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendVerificationEmail, notifyAdminOfNewUser } = require('../utils/email');

// =======================
// REGISTER CONTROLLER
// =======================
const register = async (req, res) => {
  try {
    const get = (key) => {
      if (req.body && typeof req.body[key] !== 'undefined') return String(req.body[key]).trim();
      return '';
    };

    const fullName = get('fullName');
    const email = get('email');
    const phone = get('phone');
    const username = get('username');
    const password = get('password');
    const confirmPassword = get('confirmPassword');
    const dob = get('dob');
    const ssn = get('ssn');
    const bankName = get('bankName');
    const accountType = get('accountType');
    const accountStatus = get('accountStatus');

    const idFront = req.files?.idFront?.[0]?.filename || '';
    const idBack = req.files?.idBack?.[0]?.filename || '';

    // Validate required fields
    const required = { fullName, email, phone, username, password, confirmPassword, dob, ssn, bankName, accountType, accountStatus };
    for (const [k, v] of Object.entries(required)) {
      if (!v) {
        return res.status(400).json({ success: false, message: 'All fields are required', field: k });
      }
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedUsername = username.toLowerCase();

    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: normalizedUsername }]
    });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const dobDate = isNaN(Date.parse(dob)) ? null : new Date(dob);

    const newUser = new User({
      fullName,
      email: normalizedEmail,
      phone,
      username: normalizedUsername,
      password: hashedPassword,
      dob: dobDate || dob,
      ssn,
      bankName,
      idFront,
      idBack,
      isVerified: false,
      kycStatus: 'pending',
      accountType,
      accountStatus
    });

    await newUser.save();

    const verificationToken = jwt.sign(
      { id: newUser._id, role: newUser.role || 'user' },
      process.env.JWT_SECRET || 'dev_secret_fallback',
      { expiresIn: '1d' }
    );

    sendVerificationEmail(newUser.email, newUser.fullName, verificationToken).catch(console.error);
    notifyAdminOfNewUser(newUser).catch(console.error);

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. Verification email sent.',
      user: {
        id: newUser._id,
        username: newUser.username,
        fullName: newUser.fullName,
        bankName: newUser.bankName,
        accountType: newUser.accountType,
        accountStatus: newUser.accountStatus,
        kycStatus: newUser.kycStatus,
        isVerified: newUser.isVerified
      }
    });
  } catch (err) {
    console.error('❌ Registration error:', err);
    return res.status(500).json({
      success: false,
      message: 'Registration failed',
      details: err.message
    });
  }
};

// =======================
// LOGIN CONTROLLER
// =======================
const login = async (req, res) => {
  try {
    const username = (req.body?.username || '').trim().toLowerCase();
    const password = (req.body?.password || '').trim();

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

    const token = jwt.sign(
      { id: user._id, role: user.role || 'user' },
      process.env.JWT_SECRET || 'dev_secret_fallback',
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        role: user.role || 'user',
        isVerified: user.isVerified,
        bankName: user.bankName,
        accountType: user.accountType,
        accountStatus: user.accountStatus,
        kycStatus: user.kycStatus
      }
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
      details: err.message
    });
  }
};

module.exports = { register, login };
