const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./user');
const Transaction = require('./transaction'); // model for logging transfers

const router = express.Router();

/**
 * POST /auth/login
 * Handles login for both admin and normal users
 */
router.post('/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if ((!email && !username) || !password) {
      return res.status(400).json({ success: false, error: 'Username/Email and password are required' });
    }

    // Find user by email or username
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else {
      user = await User.findOne({ username });
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Validate password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Admin login → return all seeded accounts + transactions
    if (user.role === 'admin') {
      const accounts = await User.find({ isSeeded: true });
      const transactions = await Transaction.find().sort({ date: -1 }).limit(9);
      const scheduled = await Transaction.find({ status: 'scheduled' }).sort({ date: 1 });

      return res.json({
        success: true,
        role: 'admin',
        token,
        admin: {
          fullName: user.fullName,
          email: user.email,
          accountType: user.accountType,
          accountNumber: user.accountNumber,
          balance: user.balance,
          availableBalance: user.availableBalance
        },
        accounts: accounts.map(acc => ({
          fullName: acc.fullName,
          email: acc.email,
          accountType: acc.accountType,
          accountNumber: acc.accountNumber,
          balance: acc.balance,
          availableBalance: acc.availableBalance
        })),
        transactions,
        scheduled
      });
    }

    // Normal user login → return only their own profile
    return res.json({
      success: true,
      role: 'user',
      token,
      fullName: user.fullName,
      email: user.email,
      accountType: user.accountType,
      accountNumber: user.accountNumber,
      balance: user.balance,
      availableBalance: user.availableBalance
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /auth/register
 * Creates a new user account
 */
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, username, password, accountType } = req.body;

    // Check if user already exists
    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      fullName,
      email,
      username,
      password: hashed,
      accountType,
      accountNumber: Math.floor(Math.random() * 1e16).toString(),
      balance: 0,
      availableBalance: 0,
      role: 'user',
      isSeeded: false
    });

    await newUser.save();

    return res.json({ success: true, message: 'User registered successfully', user: newUser });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * POST /auth/fake-transfer
 * Allows admin to transfer funds between accounts
 */
router.post('/fake-transfer', async (req, res) => {
  try {
    const { fromEmail, toEmail, amount } = req.body;

    if (!fromEmail || !toEmail || !amount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const from = await User.findOne({ email: fromEmail });
    const to = await User.findOne({ email: toEmail });

    if (!from || !to) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }
    if (from.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admin can transfer' });
    }
    if (from.balance < amount) {
      return res.status(400).json({ success: false, error: 'Insufficient funds' });
    }

    // Perform transfer
    from.balance -= amount;
    to.balance += amount;

    await from.save();
    await to.save();

    // Log transaction
    const tx = new Transaction({
      from: from.fullName,
      to: to.fullName,
      amount,
      date: new Date(),
      status: 'completed'
    });
    await tx.save();

    return res.json({
      success: true,
      message: `Transferred $${amount} from ${from.fullName} to ${to.fullName}`,
      fromBalance: from.balance,
      toBalance: to.balance,
      transaction: tx
    });
  } catch (err) {
    console.error('❌ Transfer error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /auth/transactions
 * Returns all transactions (admin only)
 */
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ date: -1 });
    res.json({ success: true, transactions });
  } catch (err) {
    console.error('❌ Transactions fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /auth/accounts
 * Returns all seeded accounts (admin only)
 */
router.get('/accounts', async (req, res) => {
  try {
    const accounts = await User.find({ isSeeded: true });
    res.json({
      success: true,
      accounts: accounts.map(acc => ({
        fullName: acc.fullName,
        email: acc.email,
        accountType: acc.accountType,
        accountNumber: acc.accountNumber,
        balance: acc.balance,
        availableBalance: acc.availableBalance
      }))
    });
  } catch (err) {
    console.error('❌ Accounts fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /auth/kyc
 * Returns demo KYC approvals
 */
router.get('/kyc', async (req, res) => {
  try {
    // Replace with real KYC model/query
    const kyc = [
      { fullName: 'Richard Scott', email: 'user@metabankamerica.com', status: 'pending' },
      { fullName: 'Barry Scott', email: 'savings@metabankamerica.com', status: 'approved' }
    ];
    res.json({ success: true, kyc });
  } catch (err) {
    console.error('❌ KYC fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /auth/users
 * Returns all users
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json({ success: true, users });
  } catch (err) {
    console.error('❌ Users fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * GET /auth/tickets
 * Returns demo support tickets
 */
router.get('/tickets', async (req, res) => {
  try {
    // Replace with real Ticket model/query
    const tickets = [
      { subject: 'Login issue', userEmail: 'user@metabankamerica.com', status: 'open' },
      { subject: 'Transfer delay', userEmail: 'savings@metabankamerica.com', status: 'closed' }
    ];
    res.json({ success: true, tickets });
  } catch (err) {
    console.error('❌ Tickets fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
