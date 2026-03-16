// Hot Potato MVP Backend
// Frictionless influencer onboarding + points distribution

const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

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

// Mock user middleware for testing
app.use((req, res, next) => {
  if (req.body && req.body._mockUser && process.env.NODE_ENV !== 'production') {
    const mockUser = req.body._mockUser;
    // Add or update mock user in store
    if (!req.app.locals.users.has(mockUser.id)) {
      req.app.locals.users.set(mockUser.id, mockUser);
    }
    // Set session
    req.session.userId = mockUser.id;
  }
  next();
});
app.use(session({
  secret: process.env.SESSION_SECRET || 'hot-potato-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));

// In-memory store for MVP (replace with DB later)
const users = new Map();
const markets = new Map();
const positions = new Map();
let marketIdCounter = 1;
let userIdCounter = 1;

// Routes
const authRoutes = require('./routes/auth');
const marketsRoutes = require('./routes/markets');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/markets', marketsRoutes);
app.use('/api/admin', adminRoutes);

// Serve static test interface
app.use(express.static('public'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    version: '1.0.0-mvp',
    users: users.size,
    markets: markets.size
  });
});

// Export stores for routes to use
app.locals.users = users;
app.locals.markets = markets;
app.locals.positions = positions;
app.locals.getNextUserId = () => userIdCounter++;
app.locals.getNextMarketId = () => marketIdCounter++;

// Start server
app.listen(PORT, () => {
  console.log(`🥔 Hot Potato MVP running on port ${PORT}`);
  console.log(`   Test Interface: http://localhost:${PORT}/test.html`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Admin: http://localhost:${PORT}/api/admin/dashboard`);
});

module.exports = app;
