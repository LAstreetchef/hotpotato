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
