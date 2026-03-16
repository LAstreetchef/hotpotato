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
