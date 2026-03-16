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
