// Markets routes - Create markets, place trades (with AMM liquidity)

const express = require('express');
const router = express.Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// AMM Helper Functions
const AMM = {
  // Calculate how many shares you get for a given USD amount
  calculateBuy(pool, oppositePool, usdAmount, k) {
    // When buying YES: spend from noPool, receive from yesPool
    // New opposite pool = oppositePool + usdAmount
    const newOppositePool = oppositePool + usdAmount;
    // k = yesPool * noPool (constant)
    const newPool = k / newOppositePool;
    const sharesReceived = pool - newPool;
    return { sharesReceived, newPool, newOppositePool };
  },

  // Calculate current price (probability)
  getPrice(yesPool, noPool) {
    const total = yesPool + noPool;
    return {
      yesPrice: noPool / total,
      noPrice: yesPool / total,
      yesOdds: Math.round((noPool / total) * 100),
      noOdds: Math.round((yesPool / total) * 100)
    };
  },

  // Initialize liquidity pool based on starting odds
  initPool(totalLiquidity, yesOddsPercent) {
    const yesPool = totalLiquidity * (yesOddsPercent / 100);
    const noPool = totalLiquidity * ((100 - yesOddsPercent) / 100);
    const k = yesPool * noPool;
    return { yesPool, noPool, k };
  }
};

// Create a new market
router.post('/create', requireAuth, (req, res) => {
  const { question, yesOdds = 60, resolveDate, seedLiquidity = 0 } = req.body;
  const user = req.app.locals.users.get(req.session.userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  if (!question || question.length < 10) {
    return res.status(400).json({ error: 'Question must be at least 10 characters' });
  }

  // Validate liquidity amount
  const creatorSeed = parseFloat(seedLiquidity) || 0;
  if (creatorSeed < 0) {
    return res.status(400).json({ error: 'Seed liquidity must be >= 0' });
  }
  
  if (creatorSeed > 0 && user.balance < creatorSeed) {
    return res.status(400).json({ error: 'Insufficient balance to seed liquidity' });
  }

  // Hot Potato subsidizes $50 per market, creator can add more
  const platformSubsidy = 50;
  const totalLiquidity = platformSubsidy + creatorSeed;

  // Initialize AMM pool
  const { yesPool, noPool, k } = AMM.initPool(totalLiquidity, parseInt(yesOdds));
  
  const marketId = req.app.locals.getNextMarketId();
  const market = {
    id: marketId,
    creatorId: user.id,
    creatorHandle: user.handle,
    question,
    yesPool,
    noPool,
    k,
    totalLiquidity,
    volume: 0,
    resolveDate: resolveDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(),
    resolved: false
  };
  
  req.app.locals.markets.set(marketId, market);
  
  // Deduct seed liquidity from creator
  if (creatorSeed > 0) {
    user.balance -= creatorSeed;
  }
  
  // Reward creator with points for creating market
  user.points += 100;
  
  // Calculate current odds
  const prices = AMM.getPrice(yesPool, noPool);
  
  res.json({ 
    success: true, 
    market: {
      ...market,
      ...prices
    }
  });
});

// Get all markets
router.get('/', (req, res) => {
  const markets = Array.from(req.app.locals.markets.values())
    .filter(m => !m.resolved)
    .map(m => ({
      ...m,
      ...AMM.getPrice(m.yesPool, m.noPool)
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
  
  res.json({ markets });
});

// Get single market
router.get('/:id', (req, res) => {
  const market = req.app.locals.markets.get(parseInt(req.params.id));
  
  if (!market) {
    return res.status(404).json({ error: 'Market not found' });
  }

  const prices = AMM.getPrice(market.yesPool, market.noPool);
  
  res.json({ 
    market: {
      ...market,
      ...prices
    }
  });
});

// Place a trade
router.post('/:id/trade', requireAuth, (req, res) => {
  const { side, amount } = req.body; // side: 'yes' | 'no', amount: USD
  const marketId = parseInt(req.params.id);
  const market = req.app.locals.markets.get(marketId);
  const user = req.app.locals.users.get(req.session.userId);
  
  if (!market) {
    return res.status(404).json({ error: 'Market not found' });
  }
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  if (!['yes', 'no'].includes(side)) {
    return res.status(400).json({ error: 'Side must be yes or no' });
  }
  
  const tradeAmount = parseFloat(amount);
  if (tradeAmount <= 0 || tradeAmount > user.balance) {
    return res.status(400).json({ error: 'Invalid trade amount' });
  }

  // Calculate shares received from AMM
  let sharesReceived, newYesPool, newNoPool;
  
  if (side === 'yes') {
    // Buying YES: spend noPool, receive from yesPool
    const result = AMM.calculateBuy(market.yesPool, market.noPool, tradeAmount, market.k);
    sharesReceived = result.sharesReceived;
    newYesPool = result.newPool;
    newNoPool = result.newOppositePool;
  } else {
    // Buying NO: spend yesPool, receive from noPool
    const result = AMM.calculateBuy(market.noPool, market.yesPool, tradeAmount, market.k);
    sharesReceived = result.sharesReceived;
    newNoPool = result.newPool;
    newYesPool = result.newOppositePool;
  }

  // Sanity check
  if (sharesReceived <= 0) {
    return res.status(400).json({ error: 'Trade amount too small' });
  }
  
  // Deduct from user balance
  user.balance -= tradeAmount;
  
  // Award HP Points (2x the trade amount)
  user.points += Math.floor(tradeAmount * 2);
  
  // Update market pools
  market.yesPool = newYesPool;
  market.noPool = newNoPool;
  market.volume = (market.volume || 0) + tradeAmount;
  
  // Give creator their 1% fee
  const creator = req.app.locals.users.get(market.creatorId);
  if (creator) {
    creator.balance += tradeAmount * 0.01;
  }
  
  // Store position
  const positionKey = `${user.id}-${marketId}`;
  const existingPosition = req.app.locals.positions.get(positionKey);
  
  if (existingPosition && existingPosition.side === side) {
    existingPosition.shares += sharesReceived;
    existingPosition.invested += tradeAmount;
  } else if (existingPosition && existingPosition.side !== side) {
    // Switching sides - create new position
    req.app.locals.positions.set(positionKey + `-${side}`, {
      userId: user.id,
      marketId,
      side,
      shares: sharesReceived,
      invested: tradeAmount,
      createdAt: new Date()
    });
  } else {
    req.app.locals.positions.set(positionKey, {
      userId: user.id,
      marketId,
      side,
      shares: sharesReceived,
      invested: tradeAmount,
      createdAt: new Date()
    });
  }

  // Calculate new odds
  const prices = AMM.getPrice(market.yesPool, market.noPool);
  
  res.json({
    success: true,
    trade: {
      marketId,
      side,
      amount: tradeAmount,
      shares: sharesReceived,
      pointsEarned: Math.floor(tradeAmount * 2),
      newOdds: prices
    },
    user: {
      points: user.points,
      balance: user.balance
    }
  });
});

// Get user's positions
router.get('/positions/me', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const positions = Array.from(req.app.locals.positions.values())
    .filter(p => p.userId === userId)
    .map(p => {
      const market = req.app.locals.markets.get(p.marketId);
      const prices = market ? AMM.getPrice(market.yesPool, market.noPool) : null;
      return {
        ...p,
        market,
        currentOdds: prices
      };
    });
  
  res.json({ positions });
});

module.exports = router;
