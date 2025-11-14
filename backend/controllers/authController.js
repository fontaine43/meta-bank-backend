const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    const { fullName, email, phone, username, password, dob, ssn, bankName } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      fullName,
      email,
      phone,
      username,
      password: hashedPassword,
      dob,
      ssn,
      bankName,
      role: 'user',
      kycStatus: 'pending'
    });

    await user.save();

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      message: 'Registration failed',
      details: err.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    console.log('Login request received:', req.body);

    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '1d'
    });

    console.log('Login success:', user.username);

    return res.status(200).json({
      message: 'Login successful',
      token,
      role: user.role,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      message: 'Login failed',
      details: err.message
    });
  }
};
