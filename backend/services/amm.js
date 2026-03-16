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
