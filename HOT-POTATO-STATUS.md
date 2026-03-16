# Hot Potato - Project Status & Architecture
**Date:** March 16, 2026  
**Status:** MVP with AMM implemented  
**Purpose:** Seeking advice on creator manipulation prevention & market resolution

---

## Project Overview

**Hot Potato** is a prediction market platform where social media influencers become tradable assets. Fans trade YES/NO shares on claims about a creator's future (follower milestones, content drops, brand deals, etc.).

### Core Concept
- **Creator makes claim:** "Will I hit 5M followers by August?"
- **Fans trade YES/NO:** Market discovers probability
- **Creator earns fees:** 1% of all trading volume
- **Dynamic pricing:** AMM adjusts odds based on demand

### Target Users
- TikTok, Instagram, OnlyFans, Twitter creators
- Fans who want to "invest" in their favorite creators
- Traders looking for prediction markets on social outcomes

---

## Current Technical Stack

### Backend (MVP)
- **Framework:** Node.js + Express
- **Session Management:** express-session (in-memory)
- **Data Storage:** In-memory Maps (users, markets, positions)
- **Authentication:** Mock OAuth for testing (TikTok/Instagram/OnlyFans planned)
- **API Port:** 3030

### AMM Implementation
- **Model:** Constant Product Market Maker (CPMM)
- **Formula:** `k = yesPool × noPool` (constant)
- **Liquidity:** Platform subsidizes $50 per market + optional creator seed
- **Fee Structure:** 1% to creator on every trade

### Frontend
- Static landing page at `/hotpotato/`
- Test interface at `localhost:3030/test.html` for MVP testing
- Chrome extension for contextual detection (in development)

---

## How the AMM Works

### Market Creation
```javascript
// Example: "Will Bitcoin hit $100K by July?"
Initial odds: 60% YES / 40% NO
Platform subsidy: $50
Creator seed: $0 (optional)

Calculation:
yesPool = $50 × 0.60 = $30
noPool = $50 × 0.40 = $20
k = 30 × 20 = 600 (constant)
```

### Trading Mechanism
```javascript
// User buys $10 of YES
New noPool = $20 + $10 = $30
New yesPool = 600 / 30 = $20
Shares received = $30 - $20 = 10 YES shares
New odds = 30/(20+30) = 60% YES (still 60%)

// Another user buys $15 YES
New noPool = $30 + $15 = $45
New yesPool = 600 / 45 = $13.33
Shares received = $20 - $13.33 = 6.67 shares
New odds = 45/(13.33+45) = 77% YES ⬆️
```

**Result:** As more people buy YES, the price increases (slippage). Market finds equilibrium.

### Rewards
- **Traders:** Earn 2x HP Points on every trade (gamification)
- **Creator:** Earns 1% fee + 100 HP Points for creating market
- **Winners:** Get paid when market resolves (not implemented yet)

---

## Critical Vulnerabilities

### 1. No Resolution Mechanism ❌
**Problem:** Markets have a `resolved: false` flag and `resolveDate`, but no way to actually resolve them.

**Current state:**
```javascript
market = {
  resolved: false,
  resolveDate: "2026-04-15",
  // ... no resolution logic exists
}
```

**Attack vector:** Without resolution, there's no payout system. Markets just... sit there forever.

### 2. Creator Can Game Their Own Markets ❌
**Problem:** Nothing prevents creator from:
- Trading their own market with insider knowledge
- Manipulating outcome of subjective claims ("Will I go live this week?")
- Self-resolving in their favor (when resolution is added)

**Example attack:**
```
1. Creator posts: "Will I drop new music in March?"
2. Creator buys $500 NO shares
3. Creator simply... doesn't drop music
4. Creator resolves market as NO, wins $500+
```

**Current protection:** None.

### 3. Subjective vs Objective Outcomes
**Problem:** Some markets are verifiable ("BTC hits $100K"), others are self-determined ("Will I hit 1M followers?").

**Questions:**
- Should creators be allowed to make subjective markets?
- How do we verify follower counts (can be faked with bots)?
- Who decides what "counts" as a brand deal?

### 4. No Identity Verification
**Current:** Session-based mock authentication
**Risk:** 
- Wash trading (creator uses multiple accounts)
- Sybil attacks on resolution disputes
- No real KYC/platform accountability

### 5. Liquidity Risks
**Current:** Platform subsidizes $50/market
**Questions:**
- What if creator creates 100 markets? ($5000 platform risk)
- Should creators be required to seed liquidity?
- What prevents creator from withdrawing seed before resolution?

---

## Technical Implementation Details

### Market Creation Flow
```javascript
POST /api/markets/create
{
  "question": "Will I hit 5M followers by August?",
  "yesOdds": 60,                    // Initial odds
  "seedLiquidity": 0,               // Creator can add more
  "resolveDate": "2026-08-01"       // Optional
}

Response:
{
  "success": true,
  "market": {
    "id": 1,
    "yesPool": 30,
    "noPool": 20,
    "k": 600,
    "totalLiquidity": 50,           // $50 platform subsidy
    "yesOdds": 60,
    "volume": 0
  }
}
```

### Trading Flow
```javascript
POST /api/markets/:id/trade
{
  "side": "yes",
  "amount": 10
}

Response:
{
  "success": true,
  "trade": {
    "shares": 10.5,
    "pointsEarned": 20,             // 2x multiplier
    "newOdds": {
      "yesOdds": 65,
      "noOdds": 35
    }
  },
  "user": {
    "balance": 990,
    "points": 220
  }
}
```

### Session Management (Current)
```javascript
// Mock user middleware for testing
app.use((req, res, next) => {
  if (req.body._mockUser) {
    const mockUser = req.body._mockUser;
    req.app.locals.users.set(mockUser.id, mockUser);
    req.session.userId = mockUser.id;
  }
  next();
});
```

---

## Industry Comparisons

### Polymarket (Decentralized)
- **Oracle:** UMA for resolution
- **Markets:** Only objective, verifiable outcomes
- **Creator protection:** Creators can't trade
- **Resolution:** 2-day dispute period, staked bonds
- **Scale:** $3B+ in volume

### Manifold Markets (Community)
- **Resolution:** Community-based, multiple resolvers
- **Markets:** Subjective allowed, but marked
- **Creator protection:** Reputation system
- **Incentive:** Play-money (Mana) + real-money markets

### Kalshi (Regulated)
- **Markets:** CFTC-approved event contracts only
- **Resolution:** Platform-controlled, regulated sources
- **Creator role:** None - platform creates all markets
- **Scale:** $500M+ volume, licensed exchange

### Hot Potato's Position
- **Hybrid:** Decentralized spirit + centralized MVP
- **Unique:** Influencer-driven (creators ARE the product)
- **Risk:** More subjective outcomes than competitors
- **Opportunity:** Massive creator economy ($250B market)

---

## Key Questions Seeking Advice On

### 1. Resolution System Design
**Options:**
- **A) Admin-only resolution** - Platform resolves all markets (centralized, fast)
- **B) Creator self-resolution with disputes** - Trust + verify approach
- **C) Oracle integration (UMA/Chainlink)** - Decentralized truth (complex, expensive)
- **D) Hybrid** - Objective markets use oracles, subjective use community

**Question:** Which approach for MVP? How to scale?

### 2. Creator Trading Ban
**Options:**
- **A) Hard ban** - Creators can NEVER trade their own markets
- **B) Disclosure** - Creators CAN trade but it's public
- **C) Limits** - Creators can trade up to $X or Y% of volume
- **D) No restriction** - Let market dynamics handle it

**Question:** What's the right balance between creator freedom and market integrity?

### 3. Market Categories & Verification
**Options:**
- **A) All markets allowed** - Let users decide what to trade
- **B) Verified only** - Platform approves each market
- **C) Tiered system** - Verified, Community, Unverified badges
- **D) Objective only** - Ban subjective outcomes entirely

**Question:** How do we scale verification without killing innovation?

### 4. Liquidity Strategy
**Current:** Platform pays $50/market
**Questions:**
- Sustainable at scale? (1000 markets = $50K)
- Require creator skin-in-game? (min $X seed)
- Lock creator liquidity until resolution?
- Dynamic subsidies based on creator reputation?

### 5. Fraud Prevention
**Challenges:**
- Follower counts can be botted
- "Brand deals" are private negotiations
- Content drops can be delayed indefinitely
- Self-reported outcomes are unreliable

**Question:** How do we make creator markets trustworthy without killing the vibe?

---

## Current Codebase Status

### Implemented ✅
- Express backend with CORS
- Session-based authentication (mock)
- Market creation with AMM liquidity
- Dynamic pricing (CPMM)
- Trading with share calculation
- Position tracking
- HP Points reward system
- Admin dashboard
- Test interface

### Missing ❌
- **Resolution system** (critical)
- Real OAuth (TikTok/Instagram/OnlyFans)
- Database (using in-memory Maps)
- Creator trading restrictions
- Market verification/categories
- Dispute mechanism
- Oracle integration
- KYC/identity verification
- Withdrawal/payout system
- Frontend integration with backend

### File Structure
```
hotpotato/
├── backend/
│   ├── routes/
│   │   ├── markets.js      # AMM implementation
│   │   ├── auth.js         # Mock OAuth
│   │   └── admin.js        # Admin dashboard
│   ├── public/
│   │   └── test.html       # Test interface
│   ├── server.js           # Express app
│   ├── AMM-LIQUIDITY.md    # AMM documentation
│   └── test-amm.js         # AMM test script
├── extension/              # Chrome extension (WIP)
└── landing/                # Marketing page
```

---

## Immediate Next Steps (Pending Advice)

1. **Design resolution system** - Need architectural guidance
2. **Implement creator trading ban** - Quick win for integrity
3. **Add market categories** - Objective vs Subjective
4. **Lock creator liquidity** - Prevent rug pulls
5. **Build real OAuth** - TikTok/Instagram integration

---

## Metrics & Scale Assumptions

### Target Scale (Year 1)
- 10,000 creators onboarded
- 100,000 markets created
- $10M total trading volume
- 1M users

### Economics
- Platform fee: 0% (creators get 1%, we take 0%)
- Monetization: Premium creator features, analytics, promoted markets
- Subsidy cost: $50 × 100K markets = $5M initial liquidity

### Risks
- Creator fraud tanks trust → users leave
- Subjective markets become scams
- Platform can't scale verification
- Liquidity dries up if markets don't resolve

---

## Questions for Advisory AI

1. **Which resolution approach** gives best trust/scalability tradeoff?
2. **Should creators be banned** from trading their own markets?
3. **How do we verify subjective outcomes** (follower counts, content drops)?
4. **Is $50 platform subsidy sustainable**, or should creators seed more?
5. **What's the MVP path** - centralized resolution → gradual decentralization?
6. **How do Polymarket/Manifold handle** similar creator-market problems?
7. **Legal considerations** - is this gambling? Securities? Something else?
8. **Should we allow purely subjective markets** or ban them entirely?

---

## Contact & Code

- **GitHub:** https://github.com/LAstreetchef/hotpotato
- **Test Interface:** http://localhost:3030/test.html
- **Backend API:** http://localhost:3030/api/
- **Status:** Active development, seeking architectural guidance

---

**Thank you for reviewing!** We're at a critical decision point on resolution design and creator integrity. Any insights appreciated.
