const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
  secret: 'bankSecret',
  resave: false,
  saveUninitialized: true
}));

app.set('views', path.join(__dirname, 'views'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');

const USERS_FILE = './data/users.json';

function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Home route
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Register
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const users = loadUsers();
  const {
    username, password,
    secretQuestion1, secretAnswer1,
    secretQuestion2, secretAnswer2,
    secretQuestion3, secretAnswer3,
    secretQuestion4, secretAnswer4
  } = req.body;

  if (users.find(u => u.username === username)) {
    return res.send('Username already exists. <a href="/register">Try again</a>');
  }

  const newUser = {
    username,
    password,
    secretAnswers: [
      secretAnswer1.toLowerCase(),
      secretAnswer2.toLowerCase(),
      secretAnswer3.toLowerCase(),
      secretAnswer4.toLowerCase()
    ],
    balance: {
      checking: 400000,
      savings: 500000
    },
    transactions: []
  };

  users.push(newUser);
  saveUsers(users);
  res.redirect('/login');
});

// Login
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const users = loadUsers();
  const { username, password, secretAnswer1, secretAnswer2, secretAnswer3, secretAnswer4 } = req.body;

  const user = users.find(u => u.username === username && u.password === password);
  if (!user) return res.send('Invalid credentials. <a href="/login">Try again</a>');

  const answers = [secretAnswer1, secretAnswer2, secretAnswer3, secretAnswer4].map(a => a.toLowerCase());
  const match = user.secretAnswers.every((ans, i) => ans === answers[i]);

  if (!match) return res.send('Secret answers do not match. <a href="/login">Try again</a>');

  req.session.user = user.username;
  res.redirect('/dashboard');
});

// Dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user);
  if (!user) return res.redirect('/login');

  const checking = user.balance.checking;
  const savings = user.balance.savings;
  const total = checking + savings;

  res.render('dashboard', {
    username: user.username,
    checking,
    savings,
    total,
    transactions: user.transactions
  });
});

// Wire Transfer
app.post('/transfer', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { recipient, amount, confirmationCode } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user);

  const correctCode = '123456';
  if (confirmationCode !== correctCode) {
    return res.send(`
      <p style="color:red;">Invalid confirmation code. Please input the correct code.</p>
      <a href="/dashboard">Return to Dashboard</a>
    `);
  }

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0 || amt > user.balance.checking) {
    return res.send('Invalid amount. <a href="/dashboard">Try again</a>');
  }

  user.balance.checking -= amt;
  user.transactions.push({
    type: 'Wire Transfer',
    to: recipient,
    amount: amt,
    date: new Date().toLocaleString()
  });

  saveUsers(users);
  res.redirect('/dashboard');
});

// Mobile Deposit
app.post('/deposit', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const { checkNumber, amount } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === req.session.user);

  const amt = parseFloat(amount);
  if (isNaN(amt) || amt <= 0) {
    return res.send('Invalid deposit amount. <a href="/dashboard">Try again</a>');
  }

  user.balance.checking += amt;
  user.transactions.push({
    type: 'Mobile Deposit',
    checkNumber,
    amount: amt,
    date: new Date().toLocaleString()
  });

  saveUsers(users);
  res.redirect('/dashboard');
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Admin login page
app.get('/admin', (req, res) => {
  res.render('admin');
});

// Admin dashboard
app.post('/admin', (req, res) => {
  const { username, password } = req.body;

  // Simple hardcoded admin credentials
  if (username !== 'admin' || password !== 'admin123') {
    return res.send('Access denied. <a href="/admin">Try again</a>');
  }

  const users = loadUsers();
  const allTransactions = users.flatMap(user =>
    user.transactions.map(tx => ({
      user: user.username,
      ...tx
    }))
  );

  res.render('admin-dashboard', { users, allTransactions });
});
