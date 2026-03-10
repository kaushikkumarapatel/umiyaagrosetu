// routes/adminBrokerRoutes.js
// Admin-only routes for managing brokers, assigning factories/wholesalers
// All routes protected by requireAdmin middleware in server.js

const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcrypt');
const pool    = require('../db');

// ── GET all brokers ──────────────────────────────
router.get('/brokers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.name, b.mobile, b.email, b.is_active, b.created_at,
        COUNT(DISTINCT bf.factory_id)    AS factory_count,
        COUNT(DISTINCT bw.wholesaler_id) AS wholesaler_count,
        COUNT(DISTINCT t.id)             AS trade_count
      FROM brokers b
      LEFT JOIN broker_factories  bf ON bf.broker_id = b.id
      LEFT JOIN broker_wholesalers bw ON bw.broker_id = b.id
      LEFT JOIN trades t             ON t.broker_id  = b.id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── CREATE broker ────────────────────────────────
router.post('/brokers', async (req, res) => {
  const { name, mobile, email, password } = req.body;
  if (!name || !mobile || !password) {
    return res.status(400).json({ error: 'name, mobile and password are required' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO brokers (name, mobile, email, password_hash)
       VALUES ($1, $2, $3, $4) RETURNING id, name, mobile, email, is_active, created_at`,
      [name, mobile, email || null, hash]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Mobile number already exists' });
    res.status(500).json({ error: err.message });
  }
});

// ── UPDATE broker (toggle active, reset password) ─
router.put('/brokers/:id', async (req, res) => {
  const { id } = req.params;
  const { name, mobile, email, is_active, password } = req.body;
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE brokers SET password_hash=$1 WHERE id=$2`, [hash, id]
      );
    }
    const result = await pool.query(
      `UPDATE brokers SET
         name      = COALESCE($1, name),
         mobile    = COALESCE($2, mobile),
         email     = COALESCE($3, email),
         is_active = COALESCE($4, is_active)
       WHERE id = $5
       RETURNING id, name, mobile, email, is_active`,
      [name, mobile, email, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET factories with assignment status for a broker ─
router.get('/brokers/:id/factories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.id, f.name,
        CASE WHEN bf.broker_id IS NOT NULL THEN true ELSE false END AS assigned
      FROM factories f
      LEFT JOIN broker_factories bf
        ON bf.factory_id = f.id AND bf.broker_id = $1
      ORDER BY f.name
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ASSIGN factory to broker ─────────────────────
router.post('/brokers/:id/factories', async (req, res) => {
  const { factory_id } = req.body;
  try {
    await pool.query(
      `INSERT INTO broker_factories (broker_id, factory_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, factory_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── REMOVE factory from broker ───────────────────
router.delete('/brokers/:id/factories/:fid', async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM broker_factories WHERE broker_id=$1 AND factory_id=$2`,
      [req.params.id, req.params.fid]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET wholesalers with assignment status ────────
router.get('/brokers/:id/wholesalers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.name, s.mobile, s.city,
        CASE WHEN bw.broker_id IS NOT NULL THEN true ELSE false END AS assigned
      FROM subscribers s
      LEFT JOIN broker_wholesalers bw
        ON bw.wholesaler_id = s.id AND bw.broker_id = $1
      ORDER BY s.name
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ASSIGN wholesaler to broker ───────────────────
router.post('/brokers/:id/wholesalers', async (req, res) => {
  const { wholesaler_id } = req.body;
  try {
    await pool.query(
      `INSERT INTO broker_wholesalers (broker_id, wholesaler_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, wholesaler_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── REMOVE wholesaler from broker ─────────────────
router.delete('/brokers/:id/wholesalers/:wid', async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM broker_wholesalers WHERE broker_id=$1 AND wholesaler_id=$2`,
      [req.params.id, req.params.wid]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════
// WHOLESALER MASTER DATA (uses subscribers table)
// ══════════════════════════════════════════════════

// ── GET all wholesalers ──────────────────────────
router.get('/wholesalers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.name, s.mobile, s.whatsapp_number, s.city, s.is_active,
        s.created_at,
        COUNT(DISTINCT bw.broker_id) AS broker_count,
        COUNT(DISTINCT t.id)         AS trade_count
      FROM subscribers s
      LEFT JOIN broker_wholesalers bw ON bw.wholesaler_id = s.id
      LEFT JOIN trades t              ON t.wholesaler_id  = s.id
      GROUP BY s.id
      ORDER BY s.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CREATE wholesaler ────────────────────────────
router.post('/wholesalers', async (req, res) => {
  const { name, mobile, whatsapp_number, city } = req.body;
  if (!name || !mobile) {
    return res.status(400).json({ error: 'name and mobile are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO subscribers (name, mobile, whatsapp_number, city, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, mobile, whatsapp_number, city, is_active, created_at`,
      [name, mobile, whatsapp_number || mobile, city || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Mobile number already exists' });
    res.status(500).json({ error: err.message });
  }
});

// ── UPDATE wholesaler ────────────────────────────
router.put('/wholesalers/:id', async (req, res) => {
  const { name, mobile, whatsapp_number, city, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE subscribers SET
         name             = COALESCE($1, name),
         mobile           = COALESCE($2, mobile),
         whatsapp_number  = COALESCE($3, whatsapp_number),
         city             = COALESCE($4, city),
         is_active        = COALESCE($5, is_active)
       WHERE id = $6
       RETURNING id, name, mobile, whatsapp_number, city, is_active`,
      [name, mobile, whatsapp_number, city, is_active, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════
// FACTORY MASTER DATA
// ══════════════════════════════════════════════════

// ── GET all factories ────────────────────────────
router.get('/factories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.id, f.name,
        COUNT(DISTINCT bf.broker_id) AS broker_count,
        COUNT(DISTINCT t.id)         AS trade_count
      FROM factories f
      LEFT JOIN broker_factories bf ON bf.factory_id = f.id
      LEFT JOIN trades t            ON t.factory_id  = f.id
      GROUP BY f.id
      ORDER BY f.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CREATE factory ───────────────────────────────
router.post('/factories', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const result = await pool.query(
      `INSERT INTO factories (name) VALUES ($1) RETURNING id, name`,
      [name]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Factory already exists' });
    res.status(500).json({ error: err.message });
  }
});

// ── UPDATE factory ───────────────────────────────
router.put('/factories/:id', async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query(
      `UPDATE factories SET name = COALESCE($1, name) WHERE id = $2 RETURNING id, name`,
      [name, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;