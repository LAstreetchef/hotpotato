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
