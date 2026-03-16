# CLAWDBOT BRIEFING: Hot Potato × Fancast Integration
# Drop this file at: ~/clawd/hotpotato/CLAWDBOT-BRIEFING.md
# Then tell Clawdbot: "Read ~/clawd/hotpotato/CLAWDBOT-BRIEFING.md and execute Phase 1"

---

## CONTEXT

You are upgrading **Hot Potato**, a prediction market platform where social media influencers become tradable assets. The codebase lives at `~/clawd/hotpotato/`.

Current state:
- Node.js + Express backend on port 3030
- CPMM (Constant Product Market Maker) AMM working
- In-memory Maps for data storage (users, markets, positions)
- Mock OAuth, session-based auth
- No resolution system, no payouts, no creator restrictions
- File structure: `hotpotato/backend/routes/markets.js`, `auth.js`, `admin.js`, `server.js`

We are integrating **Fancast** — a prediction market resolution + identity + trading UI layer that fixes 5 critical vulnerabilities:
1. No resolution mechanism
2. Creator can game their own markets  
3. Subjective vs objective outcomes unhandled
4. No identity verification
5. Liquidity risks

---

## PHASE 1: DATABASE MIGRATION (Do this FIRST)

### Step 1: Install PostgreSQL dependencies

```bash
cd ~/clawd/hotpotato/backend
npm install pg dotenv
```

### Step 2: Create the database config

Create file: `backend/db/pool.js`

```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/hotpotato',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

module.exports = pool;
```

Create file: `backend/.env`

```
DATABASE_URL=postgresql://localhost:5432/hotpotato
NODE_ENV=development
PORT=3030
SESSION_SECRET=hotpotato-dev-secret-change-in-prod
```

### Step 3: Create the schema

Create file: `backend/db/schema.sql`

```sql
-- Hot Potato × Fancast Schema
-- Run: psql -d hotpotato -f backend/db/schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (replaces in-memory users Map)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  display_name VARCHAR(200),
  platform VARCHAR(30),                       -- 'tiktok', 'instagram', 'onlyfans', 'twitter'
  platform_id VARCHAR(200),                   -- OAuth ID from platform
  wallet_address VARCHAR(42),                 -- Polygon wallet (Phase 2)
  balance DECIMAL(18,2) DEFAULT 1000.00,      -- Starting balance
  points INTEGER DEFAULT 0,                   -- HP Points
  is_creator BOOLEAN DEFAULT FALSE,
  kyc_tier VARCHAR(20) DEFAULT 'anonymous',   -- 'anonymous', 'verified_trader', 'verified_creator'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Markets table (replaces in-memory markets Map)
CREATE TABLE IF NOT EXISTS markets (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER REFERENCES users(id),
  question TEXT NOT NULL,
  description TEXT,
  
  -- Market classification
  tier VARCHAR(20) DEFAULT 'community',       -- 'verified', 'community', 'speculative'
  category VARCHAR(30),                       -- 'follower_milestone', 'content_drop', 'collab', 'earnings', 'celebrity', 'custom'
  
  -- AMM state (existing CPMM — DO NOT CHANGE THE MATH)
  yes_pool DECIMAL(18,6) NOT NULL,
  no_pool DECIMAL(18,6) NOT NULL,
  k DECIMAL(18,6) NOT NULL,
  total_liquidity DECIMAL(18,2) NOT NULL,
  creator_seed DECIMAL(18,2) DEFAULT 0,
  platform_seed DECIMAL(18,2) DEFAULT 10,
  volume DECIMAL(18,2) DEFAULT 0,
  trade_count INTEGER DEFAULT 0,
  
  -- Resolution system (NEW)
  status VARCHAR(20) DEFAULT 'active',        -- 'active', 'pending_resolution', 'disputed', 'resolved', 'voided'
  resolved BOOLEAN DEFAULT FALSE,
  resolution_method VARCHAR(30),              -- 'admin', 'creator_bonded', 'oracle', 'data_feed'
  resolution_outcome VARCHAR(10),             -- 'yes', 'no', 'void'
  resolution_evidence TEXT,
  resolution_proposed_at TIMESTAMPTZ,
  resolution_finalized_at TIMESTAMPTZ,
  resolution_proposer_id INTEGER REFERENCES users(id),
  resolution_bond DECIMAL(18,2) DEFAULT 0,
  dispute_window_hours INTEGER DEFAULT 24,
  
  -- Dates
  resolve_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trades table (replaces position tracking in memory)
CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES markets(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  side VARCHAR(3) NOT NULL CHECK (side IN ('yes', 'no')),
  amount DECIMAL(18,6) NOT NULL,
  shares DECIMAL(18,6) NOT NULL,
  price_at_trade DECIMAL(8,6) NOT NULL,
  is_creator_trade BOOLEAN DEFAULT FALSE,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Positions view (aggregated per user per market per side)
CREATE OR REPLACE VIEW positions AS
SELECT 
  user_id,
  market_id,
  side,
  SUM(shares) as total_shares,
  SUM(amount) as total_cost,
  CASE WHEN SUM(shares) > 0 THEN SUM(amount) / SUM(shares) ELSE 0 END as avg_entry_price,
  COUNT(*) as trade_count
FROM trades
GROUP BY user_id, market_id, side;

-- Disputes table (NEW)
CREATE TABLE IF NOT EXISTS disputes (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES markets(id) ON DELETE CASCADE,
  disputer_id INTEGER REFERENCES users(id),
  proposed_outcome VARCHAR(10) NOT NULL,
  disputed_outcome VARCHAR(10) NOT NULL,
  evidence TEXT,
  bond_amount DECIMAL(18,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'open',          -- 'open', 'escalated', 'resolved_proposer', 'resolved_disputer'
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator trading restrictions (NEW)
CREATE TABLE IF NOT EXISTS creator_restrictions (
  creator_id INTEGER REFERENCES users(id),
  market_id INTEGER REFERENCES markets(id) ON DELETE CASCADE,
  max_volume_pct DECIMAL(5,2) DEFAULT 10.00,  -- 10% of market volume
  volume_traded DECIMAL(18,2) DEFAULT 0,
  blackout_hours INTEGER DEFAULT 48,
  seed_locked BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (creator_id, market_id)
);

-- Resolution audit log (NEW — every resolution action is logged)
CREATE TABLE IF NOT EXISTS resolution_log (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES markets(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES users(id),
  action VARCHAR(30) NOT NULL,                -- 'propose', 'dispute', 'finalize', 'void', 'escalate'
  outcome VARCHAR(10),
  evidence TEXT,
  bond_amount DECIMAL(18,2),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market_id);
CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_markets_creator ON markets(creator_id);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_disputes_market ON disputes(market_id);
```

### Step 4: Create the database and run the schema

```bash
# In WSL terminal:
sudo service postgresql start
createdb hotpotato
psql -d hotpotato -f ~/clawd/hotpotato/backend/db/schema.sql
```

---

## PHASE 2: REFACTOR SERVER.JS AND ROUTES

### Step 5: Create the AMM service (extract from markets.js)

Create file: `backend/services/amm.js`

This extracts the AMM math into a reusable service. **Do not change the CPMM formulas** — they work. Just extract them.

```javascript
/**
 * AMM Service — extracted CPMM logic
 * Formula: k = yesPool × noPool (constant product)
 */

class AMMService {
  /**
   * Calculate shares received for a trade
   * @param {Object} market - { yes_pool, no_pool, k }
   * @param {string} side - 'yes' or 'no'
   * @param {number} amount - USD amount to trade
   * @returns {Object} { shares, newYesPool, newNoPool, newOdds }
   */
  static calculateTrade(market, side, amount) {
    let yesPool = parseFloat(market.yes_pool);
    let noPool = parseFloat(market.no_pool);
    const k = parseFloat(market.k);

    let shares;
    if (side === 'yes') {
      const newNoPool = noPool + amount;
      const newYesPool = k / newNoPool;
      shares = yesPool - newYesPool;
      yesPool = newYesPool;
      noPool = newNoPool;
    } else {
      const newYesPool = yesPool + amount;
      const newNoPool = k / newYesPool;
      shares = noPool - newNoPool;
      noPool = newNoPool;
      yesPool = newYesPool;
    }

    const total = yesPool + noPool;
    return {
      shares: Math.round(shares * 1000000) / 1000000,
      newYesPool: Math.round(yesPool * 1000000) / 1000000,
      newNoPool: Math.round(noPool * 1000000) / 1000000,
      newOdds: {
        yesOdds: Math.round((noPool / total) * 100),
        noOdds: Math.round((yesPool / total) * 100)
      }
    };
  }

  /**
   * Initialize pools for a new market
   * @param {number} totalLiquidity - Total seed (platform + creator)
   * @param {number} yesOdds - Initial YES probability (0-100)
   * @returns {Object} { yesPool, noPool, k }
   */
  static initializePools(totalLiquidity, yesOdds) {
    const yesPct = yesOdds / 100;
    const noPct = 1 - yesPct;
    const yesPool = totalLiquidity * yesPct;
    const noPool = totalLiquidity * noPct;
    const k = yesPool * noPool;
    return {
      yesPool: Math.round(yesPool * 1000000) / 1000000,
      noPool: Math.round(noPool * 1000000) / 1000000,
      k: Math.round(k * 1000000) / 1000000
    };
  }

  /**
   * Get current odds from pool state
   */
  static getOdds(yesPool, noPool) {
    const total = parseFloat(yesPool) + parseFloat(noPool);
    return {
      yesOdds: Math.round((parseFloat(noPool) / total) * 100),
      noOdds: Math.round((parseFloat(yesPool) / total) * 100)
    };
  }

  /**
   * Derive synthetic order book from CPMM curve
   * Used by Fancast trading UI depth chart
   */
  static deriveOrderBook(market, levels = 8) {
    const yesPool = parseFloat(market.yes_pool);
    const noPool = parseFloat(market.no_pool);
    const k = parseFloat(market.k);
    const total = yesPool + noPool;
    const currentYesPrice = noPool / total;

    const bids = [];
    const asks = [];

    for (let i = 1; i <= levels; i++) {
      const bidPrice = Math.max(0.01, currentYesPrice - i * 0.01);
      const askPrice = Math.min(0.99, currentYesPrice + i * 0.01);

      // Calculate size available at each price level
      // For a bid at price p: how many shares until price drops to p?
      const bidNoPool = total * bidPrice / (1 - bidPrice + bidPrice); // simplified
      const bidSize = Math.abs(noPool - bidNoPool) * 1000; // scale for display

      const askNoPool = total * askPrice / (1 - askPrice + askPrice);
      const askSize = Math.abs(noPool - askNoPool) * 1000;

      bids.push({ price: Math.round(bidPrice * 100) / 100, size: Math.round(bidSize) });
      asks.push({ price: Math.round(askPrice * 100) / 100, size: Math.round(askSize) });
    }

    return { bids, asks, midPrice: Math.round(currentYesPrice * 100) / 100 };
  }
}

module.exports = AMMService;
```

### Step 6: Create resolution service

Create file: `backend/services/resolution.js`

```javascript
const pool = require('../db/pool');

class ResolutionService {
  /**
   * Propose a resolution (admin or creator with bond)
   */
  static async proposeResolution(marketId, proposerId, outcome, evidence, method = 'admin') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const market = await client.query('SELECT * FROM markets WHERE id = $1', [marketId]);
      if (!market.rows[0]) throw new Error('Market not found');
      if (market.rows[0].resolved) throw new Error('Already resolved');
      if (market.rows[0].status === 'pending_resolution') throw new Error('Resolution already pending');

      let bondAmount = 0;

      // If creator-bonded resolution, deduct bond
      if (method === 'creator_bonded') {
        bondAmount = 25; // $25 bond
        const user = await client.query('SELECT balance FROM users WHERE id = $1', [proposerId]);
        if (parseFloat(user.rows[0].balance) < bondAmount) {
          throw new Error('Insufficient balance for resolution bond');
        }
        await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [bondAmount, proposerId]);
      }

      // Update market status
      await client.query(`
        UPDATE markets SET
          status = 'pending_resolution',
          resolution_outcome = $1,
          resolution_evidence = $2,
          resolution_method = $3,
          resolution_proposed_at = NOW(),
          resolution_proposer_id = $4,
          resolution_bond = $5,
          updated_at = NOW()
        WHERE id = $6
      `, [outcome, evidence, method, proposerId, bondAmount, marketId]);

      // Log the action
      await client.query(`
        INSERT INTO resolution_log (market_id, actor_id, action, outcome, evidence, bond_amount)
        VALUES ($1, $2, 'propose', $3, $4, $5)
      `, [marketId, proposerId, outcome, evidence, bondAmount]);

      await client.query('COMMIT');

      return {
        success: true,
        bond: bondAmount,
        disputeWindowHours: market.rows[0].dispute_window_hours
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Dispute a pending resolution
   */
  static async dispute(marketId, disputerId, claimedOutcome, evidence) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const market = await client.query('SELECT * FROM markets WHERE id = $1', [marketId]);
      if (!market.rows[0]) throw new Error('Market not found');
      if (market.rows[0].status !== 'pending_resolution') throw new Error('Market not in pending resolution');

      const bondAmount = parseFloat(market.rows[0].resolution_bond) || 25;

      // Check disputer balance
      const user = await client.query('SELECT balance FROM users WHERE id = $1', [disputerId]);
      if (parseFloat(user.rows[0].balance) < bondAmount) {
        throw new Error('Insufficient balance for dispute bond');
      }

      // Deduct bond
      await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [bondAmount, disputerId]);

      // Update market
      await client.query('UPDATE markets SET status = $1, updated_at = NOW() WHERE id = $2', ['disputed', marketId]);

      // Create dispute record
      await client.query(`
        INSERT INTO disputes (market_id, disputer_id, proposed_outcome, disputed_outcome, evidence, bond_amount)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [marketId, disputerId, market.rows[0].resolution_outcome, claimedOutcome, evidence, bondAmount]);

      // Log
      await client.query(`
        INSERT INTO resolution_log (market_id, actor_id, action, outcome, evidence, bond_amount)
        VALUES ($1, $2, 'dispute', $3, $4, $5)
      `, [marketId, disputerId, claimedOutcome, evidence, bondAmount]);

      await client.query('COMMIT');
      return { success: true, escalated: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Finalize resolution and pay out winners
   */
  static async finalize(marketId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const market = await client.query('SELECT * FROM markets WHERE id = $1', [marketId]);
      if (!market.rows[0]) throw new Error('Market not found');

      // Check for open disputes
      const disputes = await client.query(
        'SELECT * FROM disputes WHERE market_id = $1 AND status = $2', [marketId, 'open']
      );
      if (disputes.rows.length > 0) throw new Error('Cannot finalize: open disputes exist');

      const outcome = market.rows[0].resolution_outcome;

      // Mark resolved
      await client.query(`
        UPDATE markets SET
          resolved = true,
          status = 'resolved',
          resolution_finalized_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `, [marketId]);

      // Pay out winners: each winning share = $1 payout
      if (outcome === 'yes' || outcome === 'no') {
        const winners = await client.query(`
          SELECT user_id, SUM(shares) as total_shares
          FROM trades
          WHERE market_id = $1 AND side = $2
          GROUP BY user_id
        `, [marketId, outcome]);

        for (const winner of winners.rows) {
          const payout = parseFloat(winner.total_shares);
          await client.query(
            'UPDATE users SET balance = balance + $1 WHERE id = $2',
            [payout, winner.user_id]
          );
        }
      }

      // Return proposer bond
      if (parseFloat(market.rows[0].resolution_bond) > 0 && market.rows[0].resolution_proposer_id) {
        await client.query(
          'UPDATE users SET balance = balance + $1 WHERE id = $2',
          [market.rows[0].resolution_bond, market.rows[0].resolution_proposer_id]
        );
      }

      // Log
      await client.query(`
        INSERT INTO resolution_log (market_id, actor_id, action, outcome)
        VALUES ($1, $2, 'finalize', $3)
      `, [marketId, market.rows[0].resolution_proposer_id, outcome]);

      await client.query('COMMIT');
      return { success: true, outcome, winnersCount: 0 };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = ResolutionService;
```

### Step 7: Create creator restrictions middleware

Create file: `backend/middleware/creatorRestrictions.js`

```javascript
const pool = require('../db/pool');

/**
 * Middleware: enforce creator trading restrictions on own markets
 * - 10% volume cap
 * - 48-hour blackout before resolution
 * - Log all creator trades publicly
 */
async function enforceCreatorRestrictions(req, res, next) {
  const marketId = req.params.id;
  const userId = req.session.userId;

  if (!userId || !marketId) return next();

  try {
    const market = await pool.query('SELECT * FROM markets WHERE id = $1', [marketId]);
    if (!market.rows[0]) return next();

    const isCreator = market.rows[0].creator_id === userId;
    req.isCreatorTrade = isCreator;

    if (!isCreator) return next();

    // Check blackout period
    if (market.rows[0].resolve_date) {
      const resolveDate = new Date(market.rows[0].resolve_date);
      const blackoutStart = new Date(resolveDate.getTime() - 48 * 60 * 60 * 1000);
      if (new Date() >= blackoutStart) {
        return res.status(403).json({
          error: 'Creator blackout period',
          message: 'Cannot trade your own market within 48 hours of resolution date',
          blackoutStarted: blackoutStart.toISOString(),
          resolveDate: resolveDate.toISOString()
        });
      }
    }

    // Check market is not pending resolution
    if (['pending_resolution', 'disputed', 'resolved'].includes(market.rows[0].status)) {
      return res.status(403).json({
        error: 'Market not tradeable',
        message: `Market is ${market.rows[0].status}`
      });
    }

    // Check volume cap (10% of total volume, minimum $5 to allow some trading on new markets)
    const maxVolume = Math.max(5, parseFloat(market.rows[0].volume) * 0.10);

    const restriction = await pool.query(
      'SELECT volume_traded FROM creator_restrictions WHERE creator_id = $1 AND market_id = $2',
      [userId, marketId]
    );

    const traded = restriction.rows[0]?.volume_traded ? parseFloat(restriction.rows[0].volume_traded) : 0;
    const tradeAmount = parseFloat(req.body.amount);

    if (traded + tradeAmount > maxVolume) {
      return res.status(403).json({
        error: 'Creator volume cap',
        message: `Creator can trade up to 10% of market volume`,
        traded,
        maxVolume,
        remaining: Math.max(0, maxVolume - traded)
      });
    }

    next();
  } catch (err) {
    console.error('Creator restriction check failed:', err);
    next(); // Don't block trade on restriction check failure
  }
}

module.exports = { enforceCreatorRestrictions };
```

### Step 8: Create resolution routes

Create file: `backend/routes/resolution.js`

```javascript
const express = require('express');
const router = express.Router();
const ResolutionService = require('../services/resolution');
const pool = require('../db/pool');

// Middleware: require authenticated user
function authenticated(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// Middleware: require admin
function adminOnly(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  // For MVP: check a simple admin flag. Upgrade later.
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Admin only' });
  next();
}

// Admin resolves a market
router.post('/api/markets/:id/admin-resolve', adminOnly, async (req, res) => {
  try {
    const { outcome, evidence } = req.body;
    if (!['yes', 'no', 'void'].includes(outcome)) {
      return res.status(400).json({ error: 'Outcome must be yes, no, or void' });
    }
    const result = await ResolutionService.proposeResolution(
      req.params.id, req.session.userId, outcome, evidence, 'admin'
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Creator proposes resolution (bonded)
router.post('/api/markets/:id/propose-resolution', authenticated, async (req, res) => {
  try {
    const { outcome, evidence } = req.body;
    if (!['yes', 'no'].includes(outcome)) {
      return res.status(400).json({ error: 'Outcome must be yes or no' });
    }

    // Verify this user is the market creator
    const market = await pool.query('SELECT creator_id FROM markets WHERE id = $1', [req.params.id]);
    if (!market.rows[0] || market.rows[0].creator_id !== req.session.userId) {
      return res.status(403).json({ error: 'Only the market creator can propose resolution' });
    }

    const result = await ResolutionService.proposeResolution(
      req.params.id, req.session.userId, outcome, evidence, 'creator_bonded'
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Dispute a resolution
router.post('/api/markets/:id/dispute', authenticated, async (req, res) => {
  try {
    const { claimedOutcome, evidence } = req.body;
    const result = await ResolutionService.dispute(
      req.params.id, req.session.userId, claimedOutcome, evidence
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Finalize a resolution (after dispute window)
router.post('/api/markets/:id/finalize', adminOnly, async (req, res) => {
  try {
    const result = await ResolutionService.finalize(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get resolution status for a market
router.get('/api/markets/:id/resolution', async (req, res) => {
  try {
    const market = await pool.query(
      'SELECT status, resolved, resolution_method, resolution_outcome, resolution_evidence, resolution_proposed_at, resolution_bond, dispute_window_hours FROM markets WHERE id = $1',
      [req.params.id]
    );
    if (!market.rows[0]) return res.status(404).json({ error: 'Market not found' });

    const disputes = await pool.query(
      'SELECT * FROM disputes WHERE market_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    const log = await pool.query(
      'SELECT * FROM resolution_log WHERE market_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.params.id]
    );

    res.json({
      ...market.rows[0],
      disputes: disputes.rows,
      auditLog: log.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

### Step 9: Create portfolio routes (for Fancast trading UI)

Create file: `backend/routes/portfolio.js`

```javascript
const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const AMMService = require('../services/amm');

// Get user's positions across all markets
router.get('/api/user/positions', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });

  try {
    const positions = await pool.query(`
      SELECT 
        p.market_id,
        p.side,
        p.total_shares,
        p.total_cost,
        p.avg_entry_price,
        m.question,
        m.yes_pool,
        m.no_pool,
        m.k,
        m.status,
        m.resolved,
        m.resolution_outcome,
        m.resolve_date,
        m.tier
      FROM positions p
      JOIN markets m ON m.id = p.market_id
      WHERE p.user_id = $1 AND p.total_shares > 0
      ORDER BY p.total_cost DESC
    `, [req.session.userId]);

    // Calculate current value and P&L for each position
    const enriched = positions.rows.map(pos => {
      const odds = AMMService.getOdds(pos.yes_pool, pos.no_pool);
      const currentPrice = pos.side === 'yes'
        ? odds.yesOdds / 100
        : odds.noOdds / 100;
      const currentValue = parseFloat(pos.total_shares) * currentPrice;
      const pnl = currentValue - parseFloat(pos.total_cost);

      return {
        marketId: pos.market_id,
        question: pos.question,
        side: pos.side,
        shares: parseFloat(pos.total_shares),
        avgEntry: parseFloat(pos.avg_entry_price),
        currentPrice,
        currentValue: Math.round(currentValue * 100) / 100,
        pnl: Math.round(pnl * 100) / 100,
        pnlPct: parseFloat(pos.total_cost) > 0
          ? Math.round((pnl / parseFloat(pos.total_cost)) * 10000) / 100
          : 0,
        status: pos.status,
        resolved: pos.resolved,
        resolutionOutcome: pos.resolution_outcome,
        tier: pos.tier,
        resolveDate: pos.resolve_date
      };
    });

    // Aggregate stats
    const totalValue = enriched.reduce((sum, p) => sum + p.currentValue, 0);
    const totalPnl = enriched.reduce((sum, p) => sum + p.pnl, 0);
    const totalCost = enriched.reduce((sum, p) => sum + parseFloat(p.shares) * p.avgEntry, 0);

    res.json({
      positions: enriched,
      summary: {
        totalPositions: enriched.length,
        totalValue: Math.round(totalValue * 100) / 100,
        totalPnl: Math.round(totalPnl * 100) / 100,
        totalInvested: Math.round(totalCost * 100) / 100
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get order book for a market (derived from CPMM)
router.get('/api/markets/:id/book', async (req, res) => {
  try {
    const market = await pool.query('SELECT * FROM markets WHERE id = $1', [req.params.id]);
    if (!market.rows[0]) return res.status(404).json({ error: 'Market not found' });

    const book = AMMService.deriveOrderBook(market.rows[0]);
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get trade history for charting (OHLCV candles)
router.get('/api/markets/:id/history', async (req, res) => {
  try {
    const interval = req.query.interval || '15m';
    const intervalMap = {
      '5m': '5 minutes', '15m': '15 minutes', '1h': '1 hour',
      '4h': '4 hours', '1d': '1 day', '1w': '1 week'
    };
    const pgInterval = intervalMap[interval] || '15 minutes';

    const candles = await pool.query(`
      SELECT
        date_trunc('hour', created_at) + 
          (EXTRACT(minute FROM created_at)::int / ${interval === '5m' ? 5 : interval === '15m' ? 15 : 60}) * 
          interval '${pgInterval}' as bucket,
        (array_agg(price_at_trade ORDER BY created_at ASC))[1] as open,
        MAX(price_at_trade) as high,
        MIN(price_at_trade) as low,
        (array_agg(price_at_trade ORDER BY created_at DESC))[1] as close,
        SUM(amount) as volume,
        COUNT(*) as trades
      FROM trades
      WHERE market_id = $1
      GROUP BY bucket
      ORDER BY bucket ASC
      LIMIT 200
    `, [req.params.id]);

    res.json(candles.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

---

## PHASE 3: WIRE IT ALL TOGETHER IN SERVER.JS

### Step 10: Update server.js

**IMPORTANT:** Read the existing `server.js` first. The changes below should be MERGED into the existing file, not replace it. Keep all existing middleware (CORS, session, body-parser, etc). Add the new requires and routes.

Add these requires at the top:
```javascript
const pool = require('./db/pool');
const resolutionRoutes = require('./routes/resolution');
const portfolioRoutes = require('./routes/portfolio');
const { enforceCreatorRestrictions } = require('./middleware/creatorRestrictions');
```

Add these route registrations after existing routes:
```javascript
app.use(resolutionRoutes);
app.use(portfolioRoutes);
```

In the existing trade endpoint in `routes/markets.js`, add the creator restrictions middleware:
```javascript
// Before the trade execution logic, add:
router.post('/api/markets/:id/trade', enforceCreatorRestrictions, async (req, res) => {
  // ... existing trade logic, but now using pool.query instead of in-memory Maps
  // Add: req.isCreatorTrade flag to log creator trades
});
```

---

## PHASE 4: MIGRATE EXISTING ROUTES TO USE POSTGRESQL

### Step 11: Update markets.js to use PostgreSQL

This is the biggest refactor. Read the current `backend/routes/markets.js` file. For each endpoint:

1. Replace `req.app.locals.markets.get(id)` → `await pool.query('SELECT * FROM markets WHERE id = $1', [id])`
2. Replace `req.app.locals.markets.set(id, market)` → `await pool.query('UPDATE markets SET ... WHERE id = $1', [...])`  
3. Replace `req.app.locals.users.get(id)` → `await pool.query('SELECT * FROM users WHERE id = $1', [id])`
4. Keep the AMM math exactly the same — use `AMMService.calculateTrade()` and `AMMService.initializePools()`
5. After each trade, INSERT into the trades table
6. After each trade, update creator_restrictions if `req.isCreatorTrade`

**Do NOT change the CPMM formula. Do NOT change the API response format. Only change the storage layer.**

---

## VERIFICATION CHECKLIST

After all phases are complete, test:

```bash
# 1. Create a market
curl -X POST http://localhost:3030/api/markets/create \
  -H "Content-Type: application/json" \
  -d '{"question": "Will I hit 5M followers by August?", "yesOdds": 60, "seedLiquidity": 25}'

# 2. Execute a trade  
curl -X POST http://localhost:3030/api/markets/1/trade \
  -H "Content-Type: application/json" \
  -d '{"side": "yes", "amount": 10}'

# 3. Check portfolio
curl http://localhost:3030/api/user/positions

# 4. Check order book
curl http://localhost:3030/api/markets/1/book

# 5. Propose resolution (admin)
curl -X POST http://localhost:3030/api/markets/1/admin-resolve \
  -H "Content-Type: application/json" \
  -d '{"outcome": "yes", "evidence": "https://socialblade.com/creator/proof"}'

# 6. Check resolution status
curl http://localhost:3030/api/markets/1/resolution

# 7. Finalize resolution
curl -X POST http://localhost:3030/api/markets/1/finalize
```

---

## NOTES FOR CLAWDBOT

- **Read existing files before modifying.** Don't overwrite — merge.
- **The CPMM math is correct.** Do not change `k = yesPool × noPool` or the share calculation formula.
- **PostgreSQL must be running in WSL** before testing: `sudo service postgresql start`
- **The .env file should NOT be committed to git.** Add it to `.gitignore`.
- **Every resolution action goes in resolution_log.** This is the audit trail.
- **Creator restrictions are middleware**, not route logic. They slot into the existing trade endpoint.
- **The Fancast React trading UI** (built separately) will connect to the new `/api/user/positions`, `/api/markets/:id/book`, and `/api/markets/:id/history` endpoints. That integration comes after Phase 4.
