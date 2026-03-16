// Markets routes - Create markets, place trades (with PostgreSQL + AMM liquidity)

const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const AMMService = require('../services/amm');
const { enforceCreatorRestrictions } = require('../middleware/creatorRestrictions');

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// Create a new market
router.post('/create', requireAuth, async (req, res) => {
  const { question, yesOdds = 60, resolveDate, seedLiquidity = 0, tier = 'community', category } = req.body;
  
  try {
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.userId]);
    const user = userResult.rows[0];
    
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
    
    if (creatorSeed > 0 && parseFloat(user.balance) < creatorSeed) {
      return res.status(400).json({ error: 'Insufficient balance to seed liquidity' });
    }

    // Hot Potato subsidizes $10-50 per market based on tier
    const platformSubsidy = tier === 'verified' ? 50 : 10;
    const totalLiquidity = platformSubsidy + creatorSeed;

    // Initialize AMM pool using the service
    const { yesPool, noPool, k } = AMMService.initializePools(totalLiquidity, parseInt(yesOdds));
    
    // Insert market into database
    const marketResult = await pool.query(`
      INSERT INTO markets (
        creator_id, question, tier, category,
        yes_pool, no_pool, k, total_liquidity, creator_seed, platform_seed,
        resolve_date, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *
    `, [
      user.id, question, tier, category,
      yesPool, noPool, k, totalLiquidity, creatorSeed, platformSubsidy,
      resolveDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    ]);
    
    const market = marketResult.rows[0];
    
    // Deduct seed liquidity from creator
    if (creatorSeed > 0) {
      await pool.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [creatorSeed, user.id]);
    }
    
    // Reward creator with points for creating market
    await pool.query('UPDATE users SET points = points + 100 WHERE id = $1', [user.id]);
    
    // Initialize creator restrictions
    await pool.query(`
      INSERT INTO creator_restrictions (creator_id, market_id)
      VALUES ($1, $2)
    `, [user.id, market.id]);
    
    // Calculate current odds
    const prices = AMMService.getOdds(market.yes_pool, market.no_pool);
    
    res.json({ 
      success: true, 
      market: {
        id: market.id,
        creatorId: market.creator_id,
        creatorHandle: user.username,
        question: market.question,
        tier: market.tier,
        yesPool: parseFloat(market.yes_pool),
        noPool: parseFloat(market.no_pool),
        k: parseFloat(market.k),
        totalLiquidity: parseFloat(market.total_liquidity),
        volume: parseFloat(market.volume),
        resolveDate: market.resolve_date,
        createdAt: market.created_at,
        resolved: market.resolved,
        status: market.status,
        ...prices
      }
    });
  } catch (err) {
    console.error('Market creation error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all markets
router.get('/', async (req, res) => {
  try {
    const { tier, status = 'active' } = req.query;
    
    let query = `
      SELECT m.*, u.username as creator_handle
      FROM markets m
      LEFT JOIN users u ON u.id = m.creator_id
      WHERE m.resolved = FALSE AND m.status = $1
    `;
    const params = [status];
    
    if (tier) {
      query += ` AND m.tier = $2`;
      params.push(tier);
    }
    
    query += ` ORDER BY m.created_at DESC LIMIT 100`;
    
    const result = await pool.query(query, params);
    
    const markets = result.rows.map(m => ({
      id: m.id,
      creatorId: m.creator_id,
      creatorHandle: m.creator_handle,
      question: m.question,
      tier: m.tier,
      category: m.category,
      yesPool: parseFloat(m.yes_pool),
      noPool: parseFloat(m.no_pool),
      k: parseFloat(m.k),
      totalLiquidity: parseFloat(m.total_liquidity),
      volume: parseFloat(m.volume),
      tradeCount: m.trade_count,
      resolveDate: m.resolve_date,
      createdAt: m.created_at,
      resolved: m.resolved,
      status: m.status,
      ...AMMService.getOdds(m.yes_pool, m.no_pool)
    }));
    
    res.json({ markets });
  } catch (err) {
    console.error('Markets fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single market
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.*, u.username as creator_handle
      FROM markets m
      LEFT JOIN users u ON u.id = m.creator_id
      WHERE m.id = $1
    `, [req.params.id]);
    
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Market not found' });
    }
    
    const m = result.rows[0];
    const prices = AMMService.getOdds(m.yes_pool, m.no_pool);
    
    res.json({ 
      market: {
        id: m.id,
        creatorId: m.creator_id,
        creatorHandle: m.creator_handle,
        question: m.question,
        tier: m.tier,
        category: m.category,
        yesPool: parseFloat(m.yes_pool),
        noPool: parseFloat(m.no_pool),
        k: parseFloat(m.k),
        totalLiquidity: parseFloat(m.total_liquidity),
        volume: parseFloat(m.volume),
        tradeCount: m.trade_count,
        resolveDate: m.resolve_date,
        createdAt: m.created_at,
        resolved: m.resolved,
        status: m.status,
        ...prices
      }
    });
  } catch (err) {
    console.error('Market fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Place a trade (with creator restrictions middleware)
router.post('/:id/trade', enforceCreatorRestrictions, requireAuth, async (req, res) => {
  const { side, amount } = req.body;
  const marketId = parseInt(req.params.id);
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Fetch market and user with row locking
    const marketResult = await client.query('SELECT * FROM markets WHERE id = $1 FOR UPDATE', [marketId]);
    const market = marketResult.rows[0];
    
    if (!market) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Market not found' });
    }
    
    if (market.status !== 'active') {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: `Market is ${market.status}, not tradeable` });
    }
    
    const userResult = await client.query('SELECT * FROM users WHERE id = $1 FOR UPDATE', [req.session.userId]);
    const user = userResult.rows[0];
    
    if (!user) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!['yes', 'no'].includes(side)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Side must be yes or no' });
    }
    
    const tradeAmount = parseFloat(amount);
    if (tradeAmount <= 0 || tradeAmount > parseFloat(user.balance)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid trade amount or insufficient balance' });
    }

    // Calculate shares received from AMM using the service
    const ammResult = AMMService.calculateTrade(market, side, tradeAmount);
    const { shares, newYesPool, newNoPool, newOdds } = ammResult;

    // Sanity check
    if (shares <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Trade amount too small' });
    }
    
    // Calculate price at trade
    const priceAtTrade = side === 'yes' 
      ? newOdds.yesOdds / 100 
      : newOdds.noOdds / 100;
    
    // Deduct from user balance
    await client.query('UPDATE users SET balance = balance - $1 WHERE id = $2', [tradeAmount, user.id]);
    
    // Award HP Points (2x the trade amount)
    const pointsEarned = Math.floor(tradeAmount * 2);
    await client.query('UPDATE users SET points = points + $1 WHERE id = $2', [pointsEarned, user.id]);
    
    // Update market pools and volume
    await client.query(`
      UPDATE markets SET
        yes_pool = $1,
        no_pool = $2,
        volume = volume + $3,
        trade_count = trade_count + 1,
        updated_at = NOW()
      WHERE id = $4
    `, [newYesPool, newNoPool, tradeAmount, marketId]);
    
    // Give creator their 1% fee
    await client.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2',
      [tradeAmount * 0.01, market.creator_id]
    );
    
    // Insert trade record
    await client.query(`
      INSERT INTO trades (market_id, user_id, side, amount, shares, price_at_trade, is_creator_trade, points_earned)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [marketId, user.id, side, tradeAmount, shares, priceAtTrade, req.isCreatorTrade || false, pointsEarned]);
    
    // Update creator restrictions if this is a creator trade
    if (req.isCreatorTrade) {
      await client.query(`
        UPDATE creator_restrictions 
        SET volume_traded = volume_traded + $1
        WHERE creator_id = $2 AND market_id = $3
      `, [tradeAmount, user.id, marketId]);
    }
    
    await client.query('COMMIT');
    
    // Fetch updated balances
    const updatedUser = await pool.query('SELECT points, balance FROM users WHERE id = $1', [user.id]);
    
    res.json({
      success: true,
      trade: {
        marketId,
        side,
        amount: tradeAmount,
        shares,
        pointsEarned,
        newOdds
      },
      user: {
        points: parseInt(updatedUser.rows[0].points),
        balance: parseFloat(updatedUser.rows[0].balance)
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Trade execution error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Get user's positions (use the positions view)
router.get('/positions/me', requireAuth, async (req, res) => {
  try {
    const result = await pool.query(`
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
        m.resolution_outcome
      FROM positions p
      JOIN markets m ON m.id = p.market_id
      WHERE p.user_id = $1 AND p.total_shares > 0
      ORDER BY p.total_cost DESC
    `, [req.session.userId]);
    
    const positions = result.rows.map(p => {
      const odds = AMMService.getOdds(p.yes_pool, p.no_pool);
      return {
        marketId: p.market_id,
        question: p.question,
        side: p.side,
        shares: parseFloat(p.total_shares),
        avgEntry: parseFloat(p.avg_entry_price),
        invested: parseFloat(p.total_cost),
        status: p.status,
        resolved: p.resolved,
        resolutionOutcome: p.resolution_outcome,
        currentOdds: odds
      };
    });
    
    res.json({ positions });
  } catch (err) {
    console.error('Positions fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
