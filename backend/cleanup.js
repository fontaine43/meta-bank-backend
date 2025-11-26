const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const mongoose = require('mongoose');
const User = require('./user');

(async () => {
  try {
    // Debug: confirm the URI is loaded
    console.log('Loaded MONGO_URI:', process.env.MONGO_URI);

    await mongoose.connect(process.env.MONGO_URI, { dbName: 'metaBank' });
    console.log('✅ Connected to MongoDB');

    // Delete seeded accounts by username/email
    const result = await User.deleteMany({
      $or: [
        { username: 'admin' },
        { email: 'admin@metabankamerica.com' },
        { username: 'defaultuser' },
        { email: 'user@metabankamerica.com' },
        { username: 'savingsuser' },
        { email: 'savings@metabankamerica.com' }
      ]
    });

    console.log(`🗑️ Deleted ${result.deletedCount} seeded users`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Cleanup error:', err);
    process.exit(1);
  }
})();
