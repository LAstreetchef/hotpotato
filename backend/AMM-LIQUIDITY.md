# Hot Potato AMM Liquidity System

## Overview

Hot Potato now uses an **Automated Market Maker (AMM)** with constant product formula for dynamic pricing and liquidity provision.

## How It Works

### Market Creation

When a creator makes a market:
- **Platform subsidy:** $50 (automatic)
- **Optional creator seed:** $0+ (creator can add more for higher liquidity)
- **Initial odds:** Set by creator (e.g., 60% YES / 40% NO)

**Example:**
```javascript
POST /api/markets/create
{
  "question": "Will Bitcoin hit $100K by July?",
  "yesOdds": 60,
  "seedLiquidity": 0  // optional
}
```

**Result:**
- Total liquidity: $50 (platform subsidy)
- YES pool: 30 shares (60% of $50)
- NO pool: 20 shares (40% of $50)
- Constant k: 600 (30 × 20)

### Trading Mechanism

Uses **Constant Product Market Maker (CPMM):**

**Formula:** `k = yesPool × noPool` (constant)

**Buying YES:**
1. User spends USD → added to NO pool
2. User receives YES shares from YES pool
3. Pools adjust to maintain k constant
4. Price shifts based on new ratio

**Example Trade:**
- User buys $10 of YES
- New NO pool: 20 + 10 = 30
- New YES pool: 600 / 30 = 20
- Shares received: 30 - 20 = 10 YES shares
- New odds: 60% YES (30/(20+30))

### Dynamic Pricing

Prices automatically adjust based on demand:

**Scenario: Two $10 YES buys**
1. First trade: 10 shares @ $1.00/share
2. Second trade: 6.67 shares @ $1.50/share
3. Odds shift from 60% → 77% YES

**Why?** As YES becomes scarcer, its price increases!

## API Changes

### Create Market
```javascript
POST /api/markets/create
{
  "question": string,
  "yesOdds": number (1-99, default 60),
  "seedLiquidity": number (optional, default 0),
  "resolveDate": ISO date (optional)
}

Response:
{
  "success": true,
  "market": {
    "id": 1,
    "yesPool": 30,
    "noPool": 20,
    "k": 600,
    "yesOdds": 60,
    "noOdds": 40,
    ...
  }
}
```

### Place Trade
```javascript
POST /api/markets/:id/trade
{
  "side": "yes" | "no",
  "amount": number (USD)
}

Response:
{
  "success": true,
  "trade": {
    "shares": 10.5,
    "newOdds": {
      "yesOdds": 65,
      "noOdds": 35
    }
  }
}
```

### Get Markets
All market endpoints now include real-time odds:
```javascript
GET /api/markets
GET /api/markets/:id

Response includes:
{
  "yesOdds": 65,
  "noOdds": 35,
  "yesPrice": 0.65,
  "noPrice": 0.35,
  "yesPool": 25.3,
  "noPool": 35.7
}
```

## Benefits

✅ **Real liquidity** - Markets start with $50 tradable
✅ **Dynamic pricing** - Odds adjust automatically
✅ **Price discovery** - Market finds true probability
✅ **Slippage protection** - Large trades move price more
✅ **No order books** - Always instant execution

## Subsidized Liquidity

Hot Potato provides $50 per market to:
- Attract creators (free to create)
- Ensure tradability from day 1
- Bootstrap network effects

**Creators can:**
- Add more liquidity for bonus
- Earn 1% fees on all trades
- Withdraw seed when market resolves

## Market Resolution

When market resolves:
- Winning side gets entire pool
- Liquidity providers get seed back + fees
- Traders get paid based on shares held

## Testing

Run the AMM test:
```bash
cd backend
node test-amm.js
```

Shows dynamic pricing with sample trades.

## Future Enhancements

- [ ] Liquidity mining rewards
- [ ] LP tokens for pool providers
- [ ] Multi-outcome markets (>2 sides)
- [ ] Automated market resolution (oracles)
- [ ] Cross-market arbitrage

---

**Built:** 2026-03-16
**Status:** ✅ Live in MVP
