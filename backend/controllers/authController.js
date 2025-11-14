const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // adjust path if needed

// REGISTER CONTROLLER
const register = async (req, res) => {
  try {
    // Ensure req.body exists
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

    // Validate required fields
    if (!fullName || !email || !phone || !username || !password || !confirmPassword || !dob || !ssn || !bankName) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Check for existing user
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email or username already exists' });
    }

    // Hash password safely
    if (typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid password format' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle file uploads
    const idFront = req.files?.idFront?.[0]?.filename || '';
    const idBack = req.files?.idBack?.[0]?.filename || '';

    // Create and save user
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
      idBack
    });

    await newUser.save();

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('❌ Registration error:', err);
    res.status(500).json({ message: 'Registration failed', details: err.message });
  }
};

// LOGIN CONTROLLER
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({ message: 'Login successful', token });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ message: 'Login failed', details: err.message });
  }
};

module.exports = { register, login };
