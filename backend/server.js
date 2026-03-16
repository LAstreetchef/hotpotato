// Hot Potato MVP Backend
// Frictionless influencer onboarding + points distribution

const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const pool = require('./db/pool');

const app = express();
const PORT = process.env.PORT || 3030;

// Middleware
app.use(cors({
  origin: [
    'https://daufinder.com',
    'http://localhost:3001',
    'http://localhost:3030', // Allow test interface
    process.env.FRONTEND_URL || 'chrome-extension://*'
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'hot-potato-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// Mock user middleware for testing (must be AFTER session middleware)
app.use(async (req, res, next) => {
  if (req.body && req.body._mockUser && process.env.NODE_ENV !== 'production') {
    const mockUser = req.body._mockUser;
    try {
      // Check if user exists in DB
      const existing = await pool.query('SELECT id FROM users WHERE id = $1', [mockUser.id]);
      if (existing.rows.length === 0) {
        // Insert mock user into DB
        await pool.query(
          `INSERT INTO users (id, username, display_name, platform, balance, points, is_creator) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO UPDATE SET 
             balance = EXCLUDED.balance,
             points = EXCLUDED.points`,
          [mockUser.id, mockUser.handle, mockUser.name, mockUser.platform, 
           mockUser.balance, mockUser.points, true]
        );
      }
      // Set session
      req.session.userId = mockUser.id;
    } catch (err) {
      console.error('Mock user creation failed:', err);
    }
  }
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const marketsRoutes = require('./routes/markets');
const adminRoutes = require('./routes/admin');
const resolutionRoutes = require('./routes/resolution');
const portfolioRoutes = require('./routes/portfolio');

app.use('/api/auth', authRoutes);
app.use('/api/markets', marketsRoutes);
app.use('/api/admin', adminRoutes);
app.use(resolutionRoutes);
app.use(portfolioRoutes);

// Serve static test interface
app.use(express.static('public'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const marketCount = await pool.query('SELECT COUNT(*) FROM markets');
    res.json({ 
      status: 'ok',
      version: '1.0.0-fancast',
      database: 'postgresql',
      users: parseInt(userCount.rows[0].count),
      markets: parseInt(marketCount.rows[0].count)
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: 'Database connection failed',
      message: err.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🥔 Hot Potato MVP running on port ${PORT}`);
  console.log(`   Test Interface: http://localhost:${PORT}/test.html`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Admin: http://localhost:${PORT}/api/admin/dashboard`);
});

module.exports = app;
