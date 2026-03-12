// routes/brokerRoutes.js
// All broker-facing API endpoints

const express      = require('express');
const router       = express.Router();
const bcrypt       = require('bcrypt');
const pool         = require('../db');
const requireBroker = require('../middleware/brokerAuth');

// ── POST /api/broker/login ───────────────────────
router.post('/login', async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) {
    return res.status(400).json({ error: 'mobile and password required' });
  }
  try {
    const result = await pool.query(
      `SELECT * FROM brokers WHERE mobile = $1 AND is_active = true`,
      [mobile]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const broker = result.rows[0];
    const match  = await bcrypt.compare(password, broker.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    // Set broker session
    req.session.brokerId   = broker.id;
    req.session.brokerName = broker.name;

    req.session.save(err => {
      if (err) return res.status(500).json({ error: 'Session save failed' });
      res.json({ success: true, broker: { id: broker.id, name: broker.name, mobile: broker.mobile } });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/broker/logout ──────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ── All routes below require broker login ────────
router.use(requireBroker);

// ── GET /api/broker/me ───────────────────────────
router.get('/me', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, mobile, email FROM brokers WHERE id = $1`,
      [req.session.brokerId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/broker/dashboard ────────────────────
// Returns brokerage balance owed by each factory and wholesaler
router.get('/dashboard', async (req, res) => {
  const brokerId = req.session.brokerId;
  try {
    // Factory balances — total brokerage owed minus settled
    const factoryBalances = await pool.query(`
      SELECT
        f.id,
        f.name,
        COALESCE(SUM(t.factory_brokerage), 0)                         AS total_earned,
        COALESCE(
          (SELECT SUM(s.amount_settled) FROM settlements s
           WHERE s.broker_id=$1 AND s.party_type='factory' AND s.party_id=f.id), 0
        )                                                               AS total_settled,
        COALESCE(SUM(t.factory_brokerage), 0) -
        COALESCE(
          (SELECT SUM(s.amount_settled) FROM settlements s
           WHERE s.broker_id=$1 AND s.party_type='factory' AND s.party_id=f.id), 0
        )                                                               AS balance_due,
        COUNT(t.id)                                                     AS trade_count,
        MAX(t.trade_date)                                               AS last_trade_date
      FROM broker_factories bf
      JOIN factories f ON f.id = bf.factory_id
      LEFT JOIN trades t ON t.factory_id = f.id AND t.broker_id = $1
      WHERE bf.broker_id = $1
      GROUP BY f.id, f.name
      ORDER BY balance_due DESC
    `, [brokerId]);

    // Wholesaler balances
    const wholesalerBalances = await pool.query(`
      SELECT
        s.id,
        s.name,
        s.mobile,
        COALESCE(SUM(t.wholesaler_brokerage), 0)                       AS total_earned,
        COALESCE(
          (SELECT SUM(st.amount_settled) FROM settlements st
           WHERE st.broker_id=$1 AND st.party_type='wholesaler' AND st.party_id=s.id), 0
        )                                                               AS total_settled,
        COALESCE(SUM(t.wholesaler_brokerage), 0) -
        COALESCE(
          (SELECT SUM(st.amount_settled) FROM settlements st
           WHERE st.broker_id=$1 AND st.party_type='wholesaler' AND st.party_id=s.id), 0
        )                                                               AS balance_due,
        COUNT(t.id)                                                     AS trade_count,
        MAX(t.trade_date)                                               AS last_trade_date
      FROM broker_wholesalers bw
      JOIN wholesalers s ON s.id = bw.wholesaler_id
      LEFT JOIN trades t ON t.wholesaler_id = s.id AND t.broker_id = $1
      WHERE bw.broker_id = $1
      GROUP BY s.id, s.name, s.mobile
      ORDER BY balance_due DESC
    `, [brokerId]);

    // Summary totals
    const totalFactory    = factoryBalances.rows.reduce((sum, r) => sum + parseFloat(r.balance_due), 0);
    const totalWholesaler = wholesalerBalances.rows.reduce((sum, r) => sum + parseFloat(r.balance_due), 0);

    res.json({
      summary: {
        total_factory_due:    totalFactory,
        total_wholesaler_due: totalWholesaler,
        total_outstanding:    totalFactory + totalWholesaler,
      },
      factories:   factoryBalances.rows,
      wholesalers: wholesalerBalances.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/broker/dropdowns ────────────────────
// Returns factories, wholesalers, commodities for this broker
router.get('/dropdowns', async (req, res) => {
  const brokerId = req.session.brokerId;
  try {
    const [factories, wholesalers, commodities] = await Promise.all([
      pool.query(`
        SELECT f.id, f.name
        FROM broker_factories bf
        JOIN factories f ON f.id = bf.factory_id
        WHERE bf.broker_id = $1 AND f.is_active = true
        ORDER BY f.name
      `, [brokerId]),
      pool.query(`
        SELECT w.id, w.name, w.mobile, w.city
        FROM broker_wholesalers bw
        JOIN wholesalers w ON w.id = bw.wholesaler_id
        WHERE bw.broker_id = $1 AND w.is_active = true
        ORDER BY w.name
      `, [brokerId]),
      pool.query(`SELECT id, name FROM commodities ORDER BY name`),
    ]);
    res.json({
      factories:   factories.rows,
      wholesalers: wholesalers.rows,
      commodities: commodities.rows,
    });
  } catch (err) {
    console.error('[dropdowns]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/broker/trades ──────────────────────
router.post('/trades', async (req, res) => {
  const { factory_id, wholesaler_id, commodity_id, bags, price_per_bag, trade_date, remarks } = req.body;
  const brokerId = req.session.brokerId;

  if (!factory_id || !wholesaler_id || !commodity_id || !bags || !price_per_bag) {
    return res.status(400).json({ error: 'factory, wholesaler, commodity, bags and price are required' });
  }
  try {
    const result = await pool.query(`
      INSERT INTO trades
        (broker_id, factory_id, wholesaler_id, commodity_id, bags, price_per_bag, trade_date, remarks)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *, factory_brokerage, wholesaler_brokerage, total_brokerage
    `, [brokerId, factory_id, wholesaler_id, commodity_id, bags, price_per_bag,
        trade_date || new Date().toISOString().split('T')[0], remarks || null]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/broker/trades ───────────────────────
router.get('/trades', async (req, res) => {
  const brokerId = req.session.brokerId;
  const { from, to, factory_id, wholesaler_id, commodity_id, page = 1, limit = 50, sort, dir } = req.query;
  const offset = (page - 1) * limit;

  // Whitelist sort columns to prevent SQL injection
  const SORT_COLS = {
    trade_date:     't.trade_date',
    factory_name:   'f.name',
    wholesaler_name:'s.name',
    commodity_name: 'c.name',
  };
  const sortExpr = SORT_COLS[sort] || 't.trade_date';
  const sortDir  = dir === 'asc' ? 'ASC' : 'DESC';

  try {
    let where = [`t.broker_id = $1`];
    let params = [brokerId];
    let i = 2;

    if (from)          { where.push(`t.trade_date >= $${i++}`); params.push(from); }
    if (to)            { where.push(`t.trade_date <= $${i++}`); params.push(to); }
    if (factory_id)    { where.push(`t.factory_id = $${i++}`);  params.push(factory_id); }
    if (wholesaler_id) { where.push(`t.wholesaler_id = $${i++}`); params.push(wholesaler_id); }
    if (commodity_id)  { where.push(`t.commodity_id = $${i++}`); params.push(commodity_id); }

    const result = await pool.query(`
      SELECT
        t.id, TO_CHAR(t.trade_date, 'YYYY-MM-DD') AS trade_date, t.bags, t.price_per_bag,
        t.factory_brokerage, t.wholesaler_brokerage, t.total_brokerage,
        t.remarks, t.created_at,
        f.name AS factory_name,
        s.name AS wholesaler_name,
        c.name AS commodity_name
      FROM trades t
      JOIN factories   f ON f.id = t.factory_id
      JOIN wholesalers s ON s.id = t.wholesaler_id
      JOIN commodities c ON c.id = t.commodity_id
      WHERE ${where.join(' AND ')}
      ORDER BY ${sortExpr} ${sortDir}, t.created_at DESC
      LIMIT $${i} OFFSET $${i+1}
    `, [...params, limit, offset]);

    // Total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM trades t WHERE ${where.join(' AND ')}`,
      params
    );

    res.json({
      trades: result.rows,
      total:  parseInt(countResult.rows[0].count),
      page:   parseInt(page),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/broker/settlements ─────────────────
router.post('/settlements', async (req, res) => {
  const { party_type, party_id, amount_settled, settlement_date, financial_year, remarks } = req.body;
  const brokerId = req.session.brokerId;

  if (!party_type || !party_id || !amount_settled) {
    return res.status(400).json({ error: 'party_type, party_id and amount_settled are required' });
  }

  // Determine current financial year if not provided
  const now = new Date();
  const fy = financial_year || (now.getMonth() >= 3
    ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}`
    : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(2)}`);

  try {
    const result = await pool.query(`
      INSERT INTO settlements
        (broker_id, party_type, party_id, amount_settled, settlement_date, financial_year, remarks)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
    `, [brokerId, party_type, party_id, amount_settled,
        settlement_date || new Date().toISOString().split('T')[0], fy, remarks || null]);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/broker/report ───────────────────────
// Full settlement report data for a financial year
router.get('/report', async (req, res) => {
  const brokerId = req.session.brokerId;
  const now      = new Date();
  const defaultFY = now.getMonth() >= 3
    ? `${now.getFullYear()}-${String(now.getFullYear() + 1).slice(2)}`
    : `${now.getFullYear() - 1}-${String(now.getFullYear()).slice(2)}`;
  const fy = req.query.fy || defaultFY;

  // FY date range (April 1 → March 31)
  const fyYear  = parseInt(fy.split('-')[0]);
  const fyStart = `${fyYear}-04-01`;
  const fyEnd   = `${fyYear + 1}-03-31`;

  try {
    const broker = await pool.query(`SELECT name, mobile FROM brokers WHERE id=$1`, [brokerId]);

    const factoryReport = await pool.query(`
      SELECT
        f.id, f.name, f.city,
        COUNT(t.id)                         AS trades,
        COALESCE(SUM(t.bags),0)             AS total_bags,
        COALESCE(SUM(t.factory_brokerage),0) AS brokerage_earned,
        COALESCE(
          (SELECT SUM(amount_settled) FROM settlements
           WHERE broker_id=$1 AND party_type='factory'
             AND party_id=f.id AND financial_year=$3), 0
        )                                   AS brokerage_settled,
        COALESCE(SUM(t.factory_brokerage),0) -
        COALESCE(
          (SELECT SUM(amount_settled) FROM settlements
           WHERE broker_id=$1 AND party_type='factory'
             AND party_id=f.id AND financial_year=$3), 0
        )                                   AS balance_due
      FROM broker_factories bf
      JOIN factories f ON f.id = bf.factory_id
      LEFT JOIN trades t ON t.factory_id=f.id AND t.broker_id=$1
        AND t.trade_date BETWEEN $2 AND $3::text::date + interval '0 day'
      WHERE bf.broker_id=$1
      GROUP BY f.id, f.name ORDER BY f.name
    `, [brokerId, fyStart, fyEnd]);

    // Reuse same pattern for wholesalers
    const wholesalerReport = await pool.query(`
      SELECT
        s.id, s.name, s.mobile, s.city,
        COUNT(t.id)                              AS trades,
        COALESCE(SUM(t.bags),0)                  AS total_bags,
        COALESCE(SUM(t.wholesaler_brokerage),0)  AS brokerage_earned,
        COALESCE(
          (SELECT SUM(amount_settled) FROM settlements
           WHERE broker_id=$1 AND party_type='wholesaler'
             AND party_id=s.id AND financial_year=$3), 0
        )                                        AS brokerage_settled,
        COALESCE(SUM(t.wholesaler_brokerage),0) -
        COALESCE(
          (SELECT SUM(amount_settled) FROM settlements
           WHERE broker_id=$1 AND party_type='wholesaler'
             AND party_id=s.id AND financial_year=$3), 0
        )                                        AS balance_due
      FROM broker_wholesalers bw
      JOIN wholesalers s ON s.id = bw.wholesaler_id
      LEFT JOIN trades t ON t.wholesaler_id=s.id AND t.broker_id=$1
        AND t.trade_date BETWEEN $2 AND $3::text::date + interval '0 day'
      WHERE bw.broker_id=$1
      GROUP BY s.id, s.name, s.mobile ORDER BY s.name
    `, [brokerId, fyStart, fyEnd]);

    res.json({
      broker:          broker.rows[0],
      financial_year:  fy,
      fy_start:        fyStart,
      fy_end:          fyEnd,
      factories:       factoryReport.rows,
      wholesalers:     wholesalerReport.rows,
      totals: {
        factory_due:    factoryReport.rows.reduce((s,r)    => s + parseFloat(r.balance_due), 0),
        wholesaler_due: wholesalerReport.rows.reduce((s,r) => s + parseFloat(r.balance_due), 0),
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/broker/trades/:id ───────────────────
// Edit an existing trade — brokerage columns are GENERATED, don't update them
router.put('/trades/:id', async (req, res) => {
  const brokerId = req.session.brokerId;
  const { trade_date, factory_id, wholesaler_id, commodity_id, bags, price_per_bag, remarks } = req.body;
  if (!bags || !price_per_bag) return res.status(400).json({ error: 'bags and price_per_bag required' });
  try {
    const result = await pool.query(
      `UPDATE trades SET
         trade_date    = COALESCE($1, trade_date),
         factory_id    = COALESCE($2, factory_id),
         wholesaler_id = COALESCE($3, wholesaler_id),
         commodity_id  = COALESCE($4, commodity_id),
         bags          = $5,
         price_per_bag = $6,
         remarks       = $7
       WHERE id=$8 AND broker_id=$9
       RETURNING id, bags, total_brokerage`,
      [trade_date, factory_id, wholesaler_id, commodity_id,
       parseInt(bags), parseFloat(price_per_bag),
       remarks||null, req.params.id, brokerId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Trade not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT trade]', err.message);
    res.status(500).json({ error: err.message });
  }
});


// ── DELETE /api/broker/trades/:id ───────────────
router.delete('/trades/:id', async (req, res) => {
  const brokerId = req.session.brokerId;
  try {
    await pool.query(
      `DELETE FROM trades WHERE id=$1 AND broker_id=$2`,
      [req.params.id, brokerId]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/broker/settlements/:type/:partyId ───
// Returns settlement history for a specific party
router.get('/settlements/:type/:partyId', async (req, res) => {
  const brokerId = req.session.brokerId;
  const { type, partyId } = req.params;
  try {
    const result = await pool.query(`
      SELECT amount_settled, settlement_date, remarks, financial_year, created_at
      FROM settlements
      WHERE broker_id=$1 AND party_type=$2 AND party_id=$3
      ORDER BY settlement_date DESC
    `, [brokerId, type, partyId]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/broker/trades/batch ───────────────
// Saves multiple trades at once from the grid entry
router.post('/trades/batch', async (req, res) => {
  const { trades } = req.body;
  const brokerId = req.session.brokerId;

  if (!Array.isArray(trades) || trades.length === 0) {
    return res.status(400).json({ error: 'trades array required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const saved = [];
    for (const t of trades) {
      const { factory_id, wholesaler_id, commodity_id, bags, price_per_bag, trade_date, remarks } = t;
      if (!factory_id || !wholesaler_id || !commodity_id || !bags || !price_per_bag) continue;
      const r = await client.query(`
        INSERT INTO trades
          (broker_id, factory_id, wholesaler_id, commodity_id, bags, price_per_bag, trade_date, remarks)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        RETURNING id, bags, total_brokerage, factory_brokerage, wholesaler_brokerage
      `, [brokerId, factory_id, wholesaler_id, commodity_id, bags, price_per_bag,
          trade_date || new Date().toISOString().split('T')[0], remarks || null]);
      saved.push(r.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json({ saved: saved.length, trades: saved,
      total_brokerage: saved.reduce((s, t) => s + parseFloat(t.total_brokerage), 0) });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;