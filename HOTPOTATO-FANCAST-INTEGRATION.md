# Hot Potato × Fancast — Integration Architecture
**Date:** March 16, 2026  
**Author:** Claude (advisory)  
**Input:** HOT-POTATO-STATUS.md + Fancast prediction market architecture  
**Purpose:** Answer all 8 advisory questions + provide code-level integration plan

---

## Executive Summary

Hot Potato already has the hardest piece working: a functional CPMM trading engine with dynamic pricing. Fancast doesn't replace Hot Potato — it **fills the 5 critical gaps** (resolution, creator gaming, subjective outcomes, identity, liquidity risk) while upgrading the platform from an in-memory MVP to a production system capable of handling real money.

**The core architectural decision:** Hot Potato's Node.js backend stays as the **off-chain matching engine**. Fancast adds an **on-chain settlement layer** on Polygon. This is the exact hybrid model Polymarket evolved into — centralized speed for order matching, decentralized trust for settlement and resolution.

---

## Answers to the 8 Advisory Questions

### Q1: Which resolution approach?
**Answer: D) Hybrid — phased rollout**

**Phase 1 (MVP, weeks 1-4):** Admin-only resolution with a transparent audit trail. You (or a small trusted committee) resolve markets manually. Every resolution is logged publicly with evidence links. This is fast, lets you ship, and builds the resolution dataset you'll need later.

**Phase 2 (months 2-3):** Creator self-resolution with bonded disputes. Creator proposes resolution by staking a deposit (e.g., $25 from their earned fees). If no one disputes within 24 hours, it finalizes. If disputed, escalates to admin panel. This trains your user base on the dispute flow.

**Phase 3 (months 4-6):** UMA Optimistic Oracle integration for high-value markets (>$500 volume). Objective markets (follower counts, earnings milestones) get auto-resolution via data feeds. Subjective markets use UMA's bonded assertion + DVM escalation. Low-volume markets stay on the Phase 2 system.

**Why not jump to UMA immediately:** Your markets are $50 liquidity pools. UMA's bond requirement is $750 USDC per proposal. The economics don't work until individual markets have meaningful volume. Start centralized, earn trust, scale toward decentralization.

### Q2: Should creators be banned from trading their own markets?
**Answer: B) Disclosure with limits — the "insider filing" model**

Full ban kills creator engagement (they want skin in the game). No restriction enables the exact attack vector you documented. The middle path:

- Creators **can** trade their own markets up to **10% of total market volume**
- All creator positions are **publicly visible** (badge on the order book)
- **Blackout period:** No creator trades within 48 hours of resolution date
- **Position lock:** Creator cannot close positions in the final 7 days before resolution
- Creator's **own seed liquidity is locked** until resolution (prevents rug pull)

This is modeled on SEC insider trading disclosure rules — insiders can trade, but everyone watches.

**Implementation:** Add a `creatorId` field to market schema. In the trade endpoint, check if `req.session.userId === market.creatorId`. If yes, enforce volume cap + blackout + log to public audit trail.

### Q3: How to verify subjective outcomes?
**Answer: C) Tiered system with verification badges**

Create three market tiers:

| Tier | Verification | Resolution | Examples |
|------|-------------|------------|---------|
| **Verified (green)** | Data-feed resolvable | Automated or admin-confirmed | Follower count milestones, subscriber numbers, earnings from public data |
| **Community (yellow)** | Crowd-checkable | Creator proposes + community can dispute | Content drops, collabs, going live |
| **Speculative (orange)** | Subjective/opinion | Admin resolution only, marked as "entertainment" | "Best content this month", vibes-based claims |

For **follower counts specifically:** Don't trust creator self-reports. Integrate Social Blade API (or similar) for TikTok/Instagram/YouTube follower data. OnlyFans is harder — no public API — so use a combination of creator-signed attestations + screenshot OCR + third-party analytics providers like Supercreator or FanMetrics.

**The key insight:** You don't need to solve verification for all markets. You need to clearly *label* what's verified and what's not, so traders can price in the verification risk.

### Q4: Is $50 platform subsidy sustainable?
**Answer: No at scale. Restructure as follows:**

Current: $50 × 100K markets = **$5M burn** with no revenue offset.

New model:
- **Platform seed: $10** (reduced from $50) — enough to bootstrap the AMM, not enough to be a honeypot
- **Creator seed: minimum $25** required to create a market (skin in the game)
- **Creator seed is locked** until resolution (no rug pulls)
- **Dynamic subsidy:** Verified creators with track record get higher platform match (up to $50). New creators get $10.
- **Market creation cooldown:** Max 5 active markets per creator (prevents the "100 markets" attack)
- **Liquidity pool fees:** 0.5% of each trade goes to the liquidity pool (not creator fee, not platform fee — this is protocol revenue that funds subsidies)

**Economics at scale:**
- 10K creators × 5 markets avg × $35 avg pool = $1.75M total liquidity
- At 2% daily turnover = $35K/day volume
- 0.5% pool fee = $175/day → $63K/year protocol revenue
- Creator 1% fee = $350/day → $127K/year to creators (their incentive to participate)

### Q5: MVP path to decentralization?
**Answer: 4-phase roadmap**

```
Phase 1: Centralized MVP (NOW → Month 2)
├── Admin resolution
├── PostgreSQL migration (from in-memory Maps)  
├── Real OAuth (TikTok, Instagram)
├── Creator trading restrictions
├── Market tiers (Verified/Community/Speculative)
└── Payout system (centralized ledger)

Phase 2: Hybrid settlement (Month 2 → Month 4)
├── Polygon wallet connect (Rabby via Reown AppKit)
├── USDC deposits on Polygon
├── Off-chain matching / on-chain settlement
├── Creator self-resolution with bonded disputes
└── Gnosis CTF token minting for YES/NO shares

Phase 3: Oracle integration (Month 4 → Month 6)
├── UMA Optimistic Oracle for high-value markets
├── Data feed integration (Social Blade, etc.)
├── Auto-resolution for Verified tier markets
├── DVM escalation for disputed outcomes
└── Polygon ID for sybil resistance

Phase 4: Full decentralization (Month 6+)
├── LMSR AMM option for binary prediction markets
├── Permissionless market creation (with staking)
├── Community governance for market approval
├── Cross-chain settlement
└── SwordPay fiat on-ramp integration
```

### Q6: How do Polymarket/Manifold handle creator-market problems?
**They mostly don't — because they don't have creators.**

Polymarket: Markets are created by the platform, not by the subjects of the markets. No one "owns" the Biden election market. Resolution is via UMA oracle with $750 bond. Creators can't game because creators don't exist in the model.

Manifold: Anyone can create markets, but it's play-money (Mana). Resolution is by the market creator, with community flagging for abuse. Their reputation system punishes bad resolvers. But since it's play-money, the stakes are low.

**Hot Potato's unique challenge:** The creator IS the subject AND the market creator AND potentially the resolver AND a trader. This is a conflict of interest that no existing platform has solved because no existing platform has this structure.

**Your competitive moat is also your biggest risk.** The tiered resolution system + creator trading restrictions + identity verification together create a trust framework that doesn't exist anywhere else. If you get this right, you own a category.

### Q7: Legal considerations
**This is not legal advice. Consult a lawyer. That said:**

The three regulatory buckets:
1. **Gambling:** Binary outcome wagering with real money. Most US states require a license. Polymarket avoids this by operating offshore + using crypto.
2. **Securities:** If creator shares represent ownership or profit-sharing, they could be securities under the Howey test. Your current model (trading odds, not equity) likely doesn't qualify, but the "creator earns 1% fee" structure makes this murkier.
3. **Event contracts:** Kalshi got CFTC approval for this category. You'd need a similar license for US operations.

**Practical path:** 
- Start with play-money (HP Points only) in the US
- Real-money trading via USDC for non-US users
- SwordPay's existing compliance infrastructure for LatAm
- Consider a Kalshi-like CFTC application if you want US real-money markets

### Q8: Should we allow subjective markets?
**Answer: Yes, but with guardrails.**

Subjective markets are what make Hot Potato unique. "Will creator X drop a collab with creator Y?" is way more engaging than "will follower count reach N?" Banning them makes you a boring clone of existing platforms.

**Guardrails:**
- Subjective markets are clearly labeled (orange "Speculative" badge)
- Lower maximum liquidity for subjective markets ($100 cap vs $1000 for Verified)
- Longer dispute windows (72 hours vs 24 hours)
- Admin resolution only (no creator self-resolution for subjective markets)
- Disclaimer on every subjective market: "This market's outcome is opinion-based. Trade accordingly."

---

## Code-Level Integration Plan

### Database Migration (Priority 1)

Replace in-memory Maps with PostgreSQL. This is blocking everything else.

```sql
-- Core schema additions for Fancast integration

CREATE TABLE markets (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER REFERENCES users(id),
  question TEXT NOT NULL,
  tier VARCHAR(20) DEFAULT 'community',     -- 'verified', 'community', 'speculative'
  market_type VARCHAR(20) DEFAULT 'binary',  -- 'binary' (prediction) or 'continuous' (share)
  
  -- AMM state (keep your existing CPMM)
  yes_pool DECIMAL(18,2) NOT NULL,
  no_pool DECIMAL(18,2) NOT NULL,
  k DECIMAL(18,2) NOT NULL,
  total_liquidity DECIMAL(18,2) NOT NULL,
  creator_seed DECIMAL(18,2) DEFAULT 0,
  platform_seed DECIMAL(18,2) DEFAULT 10,
  
  -- Resolution (NEW)
  resolved BOOLEAN DEFAULT FALSE,
  resolution_method VARCHAR(30),             -- 'admin', 'creator_bonded', 'uma_oracle', 'data_feed'
  resolution_outcome VARCHAR(10),            -- 'yes', 'no', 'void'
  resolution_evidence TEXT,                  -- URL or description of evidence
  resolution_proposed_at TIMESTAMPTZ,
  resolution_finalized_at TIMESTAMPTZ,
  resolution_proposer_id INTEGER,
  resolution_bond DECIMAL(18,2) DEFAULT 0,
  dispute_window_hours INTEGER DEFAULT 24,
  
  -- On-chain (Phase 2+)
  polygon_condition_id VARCHAR(66),          -- Gnosis CTF condition hash
  uma_request_id VARCHAR(66),               -- UMA oracle request ID
  
  -- Metadata
  resolve_date TIMESTAMPTZ,
  volume DECIMAL(18,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',       -- 'active', 'pending_resolution', 'disputed', 'resolved', 'voided'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trades (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES markets(id),
  user_id INTEGER REFERENCES users(id),
  side VARCHAR(3) NOT NULL,                  -- 'yes' or 'no'
  amount DECIMAL(18,2) NOT NULL,
  shares DECIMAL(18,6) NOT NULL,
  price_at_trade DECIMAL(6,4) NOT NULL,      -- odds when trade executed
  is_creator_trade BOOLEAN DEFAULT FALSE,    -- flag for creator's own market
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE disputes (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES markets(id),
  disputer_id INTEGER REFERENCES users(id),
  proposed_outcome VARCHAR(10),              -- what was proposed
  disputed_outcome VARCHAR(10),              -- what disputer claims
  evidence TEXT,
  bond_amount DECIMAL(18,2),
  status VARCHAR(20) DEFAULT 'open',         -- 'open', 'escalated', 'resolved'
  resolved_in_favor VARCHAR(20),             -- 'proposer' or 'disputer'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE creator_restrictions (
  id SERIAL PRIMARY KEY,
  creator_id INTEGER REFERENCES users(id),
  market_id INTEGER REFERENCES markets(id),
  max_trade_volume DECIMAL(18,2),            -- 10% of market volume
  volume_traded DECIMAL(18,2) DEFAULT 0,
  blackout_starts_at TIMESTAMPTZ,            -- 48 hours before resolution
  seed_locked_until TIMESTAMPTZ,             -- resolution date
  UNIQUE(creator_id, market_id)
);
```

### Resolution System (Priority 2)

New route file: `backend/routes/resolution.js`

```javascript
// Phase 1: Admin resolution
router.post('/api/markets/:id/resolve', adminOnly, async (req, res) => {
  const { outcome, evidence } = req.body; // outcome: 'yes' | 'no' | 'void'
  const market = await getMarket(req.params.id);
  
  if (market.resolved) return res.status(400).json({ error: 'Already resolved' });
  
  // Set resolution with dispute window
  await db.query(`
    UPDATE markets SET 
      status = 'pending_resolution',
      resolution_outcome = $1,
      resolution_evidence = $2,
      resolution_method = 'admin',
      resolution_proposed_at = NOW(),
      resolution_proposer_id = $3
    WHERE id = $4
  `, [outcome, evidence, req.session.userId, market.id]);
  
  // Schedule finalization after dispute window
  // (In production: use a job queue like BullMQ)
  setTimeout(() => finalizeResolution(market.id), market.dispute_window_hours * 3600000);
  
  res.json({ success: true, disputeWindowHours: market.dispute_window_hours });
});

// Phase 2: Creator self-resolution with bond
router.post('/api/markets/:id/propose-resolution', authenticated, async (req, res) => {
  const { outcome, evidence } = req.body;
  const market = await getMarket(req.params.id);
  const user = await getUser(req.session.userId);
  
  // Only creator can propose
  if (user.id !== market.creator_id) {
    return res.status(403).json({ error: 'Only market creator can propose resolution' });
  }
  
  // Check bond (deduct from creator balance)
  const bondAmount = 25; // $25 bond
  if (user.balance < bondAmount) {
    return res.status(400).json({ error: 'Insufficient balance for resolution bond' });
  }
  
  await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [bondAmount, user.id]);
  
  await db.query(`
    UPDATE markets SET
      status = 'pending_resolution',
      resolution_outcome = $1,
      resolution_evidence = $2,
      resolution_method = 'creator_bonded',
      resolution_proposed_at = NOW(),
      resolution_proposer_id = $3,
      resolution_bond = $4
    WHERE id = $5
  `, [outcome, evidence, user.id, bondAmount, market.id]);
  
  res.json({ success: true, bond: bondAmount, disputeWindowHours: market.dispute_window_hours });
});

// Dispute a proposed resolution
router.post('/api/markets/:id/dispute', authenticated, async (req, res) => {
  const { claimedOutcome, evidence } = req.body;
  const market = await getMarket(req.params.id);
  const user = await getUser(req.session.userId);
  
  if (market.status !== 'pending_resolution') {
    return res.status(400).json({ error: 'Market not in pending resolution state' });
  }
  
  // Disputer must also bond
  const bondAmount = market.resolution_bond;
  if (user.balance < bondAmount) {
    return res.status(400).json({ error: 'Insufficient balance for dispute bond' });
  }
  
  await db.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [bondAmount, user.id]);
  await db.query('UPDATE markets SET status = $1 WHERE id = $2', ['disputed', market.id]);
  
  await db.query(`
    INSERT INTO disputes (market_id, disputer_id, proposed_outcome, disputed_outcome, evidence, bond_amount)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [market.id, user.id, market.resolution_outcome, claimedOutcome, evidence, bondAmount]);
  
  // Escalate to admin (Phase 1-2) or UMA (Phase 3)
  res.json({ success: true, escalated: true });
});

// Finalize resolution + payout
async function finalizeResolution(marketId) {
  const market = await getMarket(marketId);
  
  // Check if disputed
  const disputes = await db.query('SELECT * FROM disputes WHERE market_id = $1 AND status = $2', [marketId, 'open']);
  if (disputes.rows.length > 0) return; // Don't finalize if disputed
  
  // Mark resolved
  await db.query(`
    UPDATE markets SET 
      resolved = true, 
      status = 'resolved',
      resolution_finalized_at = NOW()
    WHERE id = $1
  `, [marketId]);
  
  // Payout winners
  const winningSide = market.resolution_outcome; // 'yes' or 'no'
  const positions = await db.query(
    'SELECT * FROM trades WHERE market_id = $1 AND side = $2',
    [marketId, winningSide]
  );
  
  for (const pos of positions.rows) {
    // Each winning share pays $1
    const payout = pos.shares;
    await db.query('UPDATE users SET balance = balance + $1 WHERE id = $2', [payout, pos.user_id]);
  }
  
  // Return proposer bond
  if (market.resolution_bond > 0) {
    await db.query('UPDATE users SET balance = balance + $1 WHERE id = $2', 
      [market.resolution_bond, market.resolution_proposer_id]);
  }
}
```

### Creator Trading Restrictions (Priority 3)

Middleware for the existing trade endpoint:

```javascript
// Add to backend/routes/markets.js — before trade execution

async function enforceCreatorRestrictions(req, market, user) {
  const isCreator = user.id === market.creator_id;
  if (!isCreator) return { allowed: true };
  
  // Check blackout period (48 hours before resolution)
  if (market.resolve_date) {
    const blackoutStart = new Date(market.resolve_date);
    blackoutStart.setHours(blackoutStart.getHours() - 48);
    if (new Date() >= blackoutStart) {
      return { allowed: false, reason: 'Creator blackout period: no trades within 48 hours of resolution' };
    }
  }
  
  // Check volume cap (10% of total market volume)
  const maxCreatorVolume = market.volume * 0.10;
  const restriction = await db.query(
    'SELECT volume_traded FROM creator_restrictions WHERE creator_id = $1 AND market_id = $2',
    [user.id, market.id]
  );
  const traded = restriction.rows[0]?.volume_traded || 0;
  
  if (traded + req.body.amount > maxCreatorVolume) {
    return { 
      allowed: false, 
      reason: `Creator volume cap reached: ${traded}/${maxCreatorVolume} (10% of market volume)` 
    };
  }
  
  return { allowed: true, isCreatorTrade: true };
}
```

---

## Fancast Trading UI Integration

The Fancast React trading UI we already built slots directly into Hot Potato's frontend. The key changes:

### What connects where:

```
Hot Potato Backend (localhost:3030)
├── /api/markets/create      → Market creation (add tier + seed requirements)
├── /api/markets/:id/trade   → Trade execution (add creator restrictions middleware)
├── /api/markets/:id/resolve → NEW: Resolution system
├── /api/markets/:id/dispute → NEW: Dispute system
├── /api/markets/:id/book    → NEW: Order book data for Fancast UI
└── /api/user/positions      → NEW: Portfolio positions for Fancast UI

Fancast React UI
├── CandlestickChart      → Connects to trade history for price candles
├── OrderEntry             → Calls /api/markets/:id/trade
├── DepthChart             → Visualizes current AMM state (yesPool/noPool)
├── PositionTracker        → Calls /api/user/positions
└── ResolutionPanel (NEW)  → Shows resolution status, dispute button, evidence
```

### New API endpoints needed:

```javascript
// Get order book representation from AMM state
GET /api/markets/:id/book
→ Derives synthetic order book from CPMM curve
→ Shows implied bids/asks at different price levels

// Get user portfolio across all markets
GET /api/user/positions
→ Aggregates all open positions with current P&L
→ Includes resolution status for each market

// Get trade history for charting
GET /api/markets/:id/history?interval=15m
→ Returns OHLCV candles from trade history
→ Used by CandlestickChart component
```

---

## Phase 1 Implementation Checklist

```
Week 1: Foundation
□ PostgreSQL migration (replace in-memory Maps)
□ Database schema with resolution + dispute tables
□ Migrate market creation to use tiers
□ Add creator_seed requirement ($25 minimum)
□ Market creation cooldown (max 5 active per creator)

Week 2: Resolution + Restrictions  
□ Admin resolution endpoint
□ Dispute system with bond
□ Creator trading restrictions middleware
□ Blackout period enforcement
□ Payout system (winning shares → balance credit)

Week 3: Frontend Integration
□ Connect Fancast trading UI to Hot Potato API
□ Add resolution status panel to market view
□ Creator position disclosure badges
□ Market tier badges (Verified/Community/Speculative)
□ Portfolio view with aggregate P&L

Week 4: Polish + Test
□ Real OAuth for at least one platform (TikTok or Instagram)
□ End-to-end test: create → trade → resolve → payout
□ Creator gaming attack simulation
□ Load test with 100 concurrent markets
□ Deploy to Render (connect to existing infra)
```

---

## File Changes Summary

```
hotpotato/
├── backend/
│   ├── db/
│   │   ├── schema.sql          # NEW: PostgreSQL schema
│   │   ├── migrations/         # NEW: Migration files
│   │   └── pool.js             # NEW: pg connection pool
│   ├── middleware/
│   │   ├── auth.js             # UPGRADE: Real session + wallet auth
│   │   └── creatorRestrictions.js  # NEW: Trading restrictions
│   ├── routes/
│   │   ├── markets.js          # UPGRADE: Add tiers, seed requirements
│   │   ├── resolution.js       # NEW: Full resolution system
│   │   ├── disputes.js         # NEW: Dispute handling
│   │   ├── portfolio.js        # NEW: Position tracking
│   │   ├── auth.js             # UPGRADE: OAuth + wallet connect
│   │   └── admin.js            # UPGRADE: Resolution admin panel
│   ├── services/
│   │   ├── amm.js              # EXTRACT: AMM logic into service
│   │   ├── payout.js           # NEW: Resolution payout calculation
│   │   └── dataFeeds.js        # NEW: Social Blade etc. (Phase 3)
│   ├── public/
│   │   └── test.html           # KEEP: Test interface
│   ├── server.js               # UPGRADE: Add new routes + db
│   └── package.json            # UPGRADE: Add pg, bull, etc.
├── frontend/                   # NEW: Fancast React app
│   ├── src/
│   │   ├── components/
│   │   │   ├── TradingUI.jsx   # FROM FANCAST: Full trading interface
│   │   │   ├── MarketCard.jsx  # FROM FANCAST: Market cards with tiers
│   │   │   ├── Resolution.jsx  # NEW: Resolution status + dispute UI
│   │   │   └── Portfolio.jsx   # NEW: Position tracking
│   │   ├── hooks/
│   │   │   ├── useMarket.js    # API hooks for market data
│   │   │   └── useWallet.js    # Wallet connection (Phase 2)
│   │   └── App.jsx
│   └── package.json
├── contracts/                  # Phase 2+: Solidity
│   ├── HotPotatoSettlement.sol
│   └── HotPotatoCTF.sol
└── HOT-POTATO-STATUS.md        # UPDATE with this plan
```
