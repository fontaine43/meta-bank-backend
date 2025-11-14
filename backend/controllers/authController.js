const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendVerificationEmail, notifyAdminOfNewUser } = require('../utils/email');

// ✅ REGISTER CONTROLLER
const register = async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ message: 'Missing form data' });
    }

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
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ message: 'Email or username already exists' });
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
      isVerified: false
    });

    await newUser.save();

    const verificationToken = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    await sendVerificationEmail(newUser.email, newUser.fullName, verificationToken);
    await notifyAdminOfNewUser(newUser);

    res.status(201).json({
      message: 'User registered successfully. Verification email sent.',
      token: verificationToken
    });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ message: 'Registration failed', details: err.message });
  }
};

// ✅ LOGIN CONTROLLER
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
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
    res.status(500).json({ message: 'Login failed', details: err.message });
  }
};

module.exports = { register, login };
