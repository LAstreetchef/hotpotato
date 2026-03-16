const express = require('express');
const router = express.Router();
const ResolutionService = require('../services/resolution');
const pool = require('../db/pool');

// Middleware: require authenticated user
function authenticated(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

// Middleware: require admin
function adminOnly(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  // For MVP: check a simple admin flag. Upgrade later.
  if (!req.session.isAdmin) return res.status(403).json({ error: 'Admin only' });
  next();
}

// Admin resolves a market
router.post('/api/markets/:id/admin-resolve', adminOnly, async (req, res) => {
  try {
    const { outcome, evidence } = req.body;
    if (!['yes', 'no', 'void'].includes(outcome)) {
      return res.status(400).json({ error: 'Outcome must be yes, no, or void' });
    }
    const result = await ResolutionService.proposeResolution(
      req.params.id, req.session.userId, outcome, evidence, 'admin'
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Creator proposes resolution (bonded)
router.post('/api/markets/:id/propose-resolution', authenticated, async (req, res) => {
  try {
    const { outcome, evidence } = req.body;
    if (!['yes', 'no'].includes(outcome)) {
      return res.status(400).json({ error: 'Outcome must be yes or no' });
    }

    // Verify this user is the market creator
    const market = await pool.query('SELECT creator_id FROM markets WHERE id = $1', [req.params.id]);
    if (!market.rows[0] || market.rows[0].creator_id !== req.session.userId) {
      return res.status(403).json({ error: 'Only the market creator can propose resolution' });
    }

    const result = await ResolutionService.proposeResolution(
      req.params.id, req.session.userId, outcome, evidence, 'creator_bonded'
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Dispute a resolution
router.post('/api/markets/:id/dispute', authenticated, async (req, res) => {
  try {
    const { claimedOutcome, evidence } = req.body;
    const result = await ResolutionService.dispute(
      req.params.id, req.session.userId, claimedOutcome, evidence
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Finalize a resolution (after dispute window)
router.post('/api/markets/:id/finalize', adminOnly, async (req, res) => {
  try {
    const result = await ResolutionService.finalize(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get resolution status for a market
router.get('/api/markets/:id/resolution', async (req, res) => {
  try {
    const market = await pool.query(
      'SELECT status, resolved, resolution_method, resolution_outcome, resolution_evidence, resolution_proposed_at, resolution_bond, dispute_window_hours FROM markets WHERE id = $1',
      [req.params.id]
    );
    if (!market.rows[0]) return res.status(404).json({ error: 'Market not found' });

    const disputes = await pool.query(
      'SELECT * FROM disputes WHERE market_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );

    const log = await pool.query(
      'SELECT * FROM resolution_log WHERE market_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.params.id]
    );

    res.json({
      ...market.rows[0],
      disputes: disputes.rows,
      auditLog: log.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
