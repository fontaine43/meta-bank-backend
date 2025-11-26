require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const { User, Ticket } = require('./models');
const { ROUTING_NUMBER } = require('./utils');

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'metaBank' });
    console.log('✅ Connected to MongoDB');

    const sha256 = (plain) => crypto.createHash('sha256').update(plain).digest('hex');

    const upsertUser = async (doc) => {
      const existing = await User.findOne({ email: doc.email });
      if (existing) return existing;
      return User.create(doc);
    };

    // Admin
    await upsertUser({
      fullName: 'Meta Admin',
      email: 'admin@metabankamerica.com',
      username: 'admin',
      password: sha256('Admin@123'), // Note: if you used bcrypt in controllers, you can set isSeeded true and any string
      bankName: 'Meta Bank',
      accountType: 'business',
      accountStatus: 'active',
      accountNumber: '8888888800000000',
      routingNumber: ROUTING_NUMBER,
      balance: 3678089,
      availableBalance: 3678089,
      isVerified: true,
      kycStatus: 'approved',
      role: 'admin',
      isSeeded: true
    });

    // Checking demo
    await upsertUser({
      fullName: 'Default User',
      email: 'user@metabankamerica.com',
      username: 'defaultuser',
      password: sha256('User@123'),
      bankName: 'Meta Bank',
      accountType: 'checking',
      accountStatus: 'active',
      accountNumber: '7777777700000000',
      routingNumber: ROUTING_NUMBER,
      balance: 278000,
      availableBalance: 278000,
      isVerified: true,
      kycStatus: 'approved',
      role: 'user',
      isSeeded: true
    });

    // Savings demo
    await upsertUser({
      fullName: 'Savings User',
      email: 'savings@metabankamerica.com',
      username: 'savingsuser',
      password: sha256('Savings@123'),
      bankName: 'Meta Bank',
      accountType: 'savings',
      accountStatus: 'active',
      accountNumber: '6666666600000000',
      routingNumber: ROUTING_NUMBER,
      balance: 3987,
      availableBalance: 3987,
      isVerified: true,
      kycStatus: 'approved',
      role: 'user',
      isSeeded: true
    });

    // Tickets
    const count = await Ticket.countDocuments();
    if (count === 0) {
      await Ticket.create([
        { userEmail: 'user@metabankamerica.com', issue: 'Login help', priority: 'Medium', status: 'open' },
        { userEmail: 'user@metabankamerica.com', issue: 'KYC status', priority: 'Low', status: 'open' }
      ]);
      console.log('🎫 Dummy tickets created');
    }

    console.log('🌱 Seed complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
})();
