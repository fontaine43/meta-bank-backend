const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');

// Import your route modules
const routes = require('./routes');       // existing API routes
const authRoutes = require('./auth');     // new auth.js routes

const app = express();

// Ensure uploads dir exists
const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log('📁 Created uploads directory');
}

// CORS configuration
const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://metabankamerica.com',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://meta-bank-frontend.onrender.com' // Render static site
];

app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      console.warn(`❌ Blocked by CORS: ${origin}`);
      cb(null, false);
    }
  },
  credentials: true
}));

// Middleware
app.use(express.json());
app.use(helmet());
app.use('/uploads', express.static(uploadsPath));

// Simple request logger
app.use((req, _res, next) => {
  console.log(`➡️  ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
app.use('/api', routes);
app.use('/auth', authRoutes);  // mount auth routes separately

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('❌ Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Start server
(async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, { dbName: 'metaBank' });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    if (process.env.NODE_ENV !== 'production') {
      mongoose.set('debug', true);
    }

    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log(`🚀 Meta Bank backend running on port ${PORT}`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('🛑 Shutting down server...');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
})();
