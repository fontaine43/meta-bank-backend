const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI || 'your_mongodb_connection_string');

async function seedUsers() {
  const users = [
    { username: 'testuser', password: 'testpass123', fullName: 'Test User', email: 'test@example.com' },
    { username: 'admin', password: 'adminpass456', fullName: 'Admin User', email: 'admin@example.com' }
  ];

  for (const user of users) {
    const exists = await User.findOne({ username: user.username });
    if (!exists) {
      const hashed = await bcrypt.hash(user.password, 10);
      await User.create({
        ...user,
        password: hashed,
        phone: '0000000000',
        dob: '1990-01-01',
        ssn: '000-00-0000',
        bankName: 'Meta Bank',
        role: user.username === 'admin' ? 'admin' : 'user',
        kycStatus: 'approved'
      });
      console.log(`Created: ${user.username}`);
    } else {
      console.log(`Skipped: ${user.username} already exists`);
    }
  }

  mongoose.disconnect();
}

seedUsers();
