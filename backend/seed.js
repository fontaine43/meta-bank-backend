const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import models directly
const User = require('./user');
const Ticket = require('./ticket');
const { ROUTING_NUMBER } = require('./utils');

(async () => {
  try {
    // Debug: confirm URI
    console.log('Loaded MONGO_URI:', process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI, { dbName: 'metaBank' });
    console.log('✅ Connected to MongoDB');

    const hashPassword = async (plain) => await bcrypt.hash(plain, 10);

    const upsertUser = async (doc) => {
      const existing = await User.findOne({ email: doc.email });
      if (existing) {
        console.log(`ℹ️ User already exists: ${doc.username}`);
        return existing;
      }
      const created = await User.create(doc);
      console.log(`✅ Seeded user: ${doc.username}`);
      return created;
    };

    // Admin (business account)
    await upsertUser({
      fullName: 'Meta Admin',
      email: 'admin@metabankamerica.com',
      username: 'admin',
      password: await hashPassword('Admin@123'),
      bankName: 'Meta Bank',
      dob: new Date('1980-01-01'),
      ssn: '000-00-0000',
      phone: '555-0000',
      accountType: 'business',
      accountStatus: 'active',
      accountNumber: '8888888800000000',
      routingNumber: ROUTING_NUMBER,
      balance: parseInt(process.env.DEFAULT_BUSINESS_BALANCE || 3240000, 10),
      availableBalance: parseInt(process.env.DEFAULT_BUSINESS_BALANCE || 3240000, 10),
      isVerified: true,
      kycStatus: 'approved',
      role: 'admin',
      isSeeded: true
    });

    // Default checking user (Richard Scott)
    await upsertUser({
      fullName: 'Richard Scott',
      email: 'user@metabankamerica.com',
      username: 'defaultuser',
      password: await hashPassword('User@123'),
      bankName: 'Meta Bank',
      dob: new Date('1990-01-01'),
      ssn: '111-11-1111',
      phone: '555-1111',
      accountType: 'checking',
      accountStatus: 'active',
      accountNumber: '7777777700000000',
      routingNumber: ROUTING_NUMBER,
      balance: parseInt(process.env.DEFAULT_CHECKING_BALANCE || 165000, 10),
      availableBalance: parseInt(process.env.DEFAULT_CHECKING_BALANCE || 165000, 10),
      isVerified: true,
      kycStatus: 'approved',
      role: 'user',
      isSeeded: true
    });

    // Savings user (Barry Scott)
    await upsertUser({
      fullName: 'Barry Scott',
      email: 'savings@metabankamerica.com',
      username: 'savingsuser',
      password: await hashPassword('Savings@123'),
      bankName: 'Meta Bank',
      dob: new Date('1995-01-01'),
      ssn: '222-22-2222',
      phone: '555-2222',
      accountType: 'savings',
      accountStatus: 'active',
      accountNumber: '6666666600000000',
      routingNumber: ROUTING_NUMBER,
      balance: parseInt(process.env.DEFAULT_SAVINGS_BALANCE || 2760, 10),
      availableBalance: parseInt(process.env.DEFAULT_SAVINGS_BALANCE || 2760, 10),
      isVerified: true,
      kycStatus: 'approved',
      role: 'user',
      isSeeded: true
    });

    // Dummy tickets
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
