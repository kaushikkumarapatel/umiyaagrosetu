// routes/admin/masterDataRoutes.js
// Full CRUD for Brokers, Factories, Wholesalers, Commodities
// Mounted at /api/admin — all routes protected by requireAdmin in server.js

const express  = require("express");
const router   = express.Router();
const db       = require("../../db");
const bcrypt   = require("bcrypt");

// ═══════════════════════════════════════════════════
// BROKERS
// ═══════════════════════════════════════════════════

// GET all brokers
router.get("/brokers", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        b.id,
        b.name,
        b.mobile,
        b.city,
        b.email,
        b.is_active,
        COUNT(DISTINCT bf.factory_id)     AS factory_count,
        COUNT(DISTINCT bw.wholesaler_id)  AS wholesaler_count,
        COUNT(DISTINCT t.id)              AS trade_count
      FROM brokers b
      LEFT JOIN broker_factories   bf ON bf.broker_id = b.id
      LEFT JOIN broker_wholesalers bw ON bw.broker_id = b.id
      LEFT JOIN trades             t  ON t.broker_id  = b.id
      GROUP BY b.id
      ORDER BY b.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("BROKER LOAD ERROR:", err);
    res.status(500).json({ error: "Failed to load brokers", details: err.message });
  }
});

// POST create broker
router.post("/brokers", async (req, res) => {
  try {
    const { name, mobile, city, email, password } = req.body;
    if (!name || !mobile || !password)
      return res.status(400).json({ error: "Name, mobile and password required" });

    const password_hash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO brokers (name, mobile, city, email, password_hash, is_active)
       VALUES ($1,$2,$3,$4,$5,true) RETURNING id,name,mobile,city,email,is_active`,
      [name, mobile, city||null, email||null, password_hash]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("BROKER CREATE ERROR:", err);
    res.status(500).json({ error: err.message.includes("unique") ? "Mobile already exists" : "Failed to create broker" });
  }
});

// PUT update broker (edit details OR reset password OR toggle active)
router.put("/brokers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, city, email, is_active, password } = req.body;

    // Password reset only
    if (password !== undefined) {
      const password_hash = await bcrypt.hash(password, 10);
      await db.query(`UPDATE brokers SET password_hash=$1 WHERE id=$2`, [password_hash, id]);
      return res.json({ success: true });
    }

    // Build dynamic update — only update fields that were sent
    const fields = [];
    const vals   = [];
    let   idx    = 1;

    if (name       !== undefined) { fields.push(`name=$${idx++}`);       vals.push(name); }
    if (mobile     !== undefined) { fields.push(`mobile=$${idx++}`);     vals.push(mobile); }
    if (city       !== undefined) { fields.push(`city=$${idx++}`);       vals.push(city||null); }
    if (email      !== undefined) { fields.push(`email=$${idx++}`);      vals.push(email||null); }
    if (is_active  !== undefined) { fields.push(`is_active=$${idx++}`);  vals.push(is_active); }

    if (!fields.length) return res.status(400).json({ error: "Nothing to update" });

    vals.push(id);
    await db.query(`UPDATE brokers SET ${fields.join(",")} WHERE id=$${idx}`, vals);
    res.json({ success: true });
  } catch (err) {
    console.error("BROKER UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update broker" });
  }
});

// ── Broker assign: list factories with assigned flag ──
router.get("/brokers/:id/factories", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT f.id, f.name,
             EXISTS(
               SELECT 1 FROM broker_factories bf
               WHERE bf.broker_id=$1 AND bf.factory_id=f.id
             ) AS assigned
      FROM factories f
      WHERE f.is_active=true
      ORDER BY f.name
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load broker factories" });
  }
});

// ── Broker assign: list wholesalers with assigned flag ──
router.get("/brokers/:id/wholesalers", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT w.id, w.name, w.mobile, w.city,
             EXISTS(
               SELECT 1 FROM broker_wholesalers bw
               WHERE bw.broker_id=$1 AND bw.wholesaler_id=w.id
             ) AS assigned
      FROM wholesalers w
      WHERE w.is_active=true
      ORDER BY w.name
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to load broker wholesalers" });
  }
});

// POST assign factory to broker
router.post("/brokers/:id/factories", async (req, res) => {
  try {
    const { factory_id } = req.body;
    await db.query(
      `INSERT INTO broker_factories (broker_id, factory_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.params.id, factory_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to assign factory" });
  }
});

// DELETE unassign factory from broker
router.delete("/brokers/:id/factories/:fid", async (req, res) => {
  try {
    await db.query(
      `DELETE FROM broker_factories WHERE broker_id=$1 AND factory_id=$2`,
      [req.params.id, req.params.fid]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to unassign factory" });
  }
});

// POST assign wholesaler to broker
router.post("/brokers/:id/wholesalers", async (req, res) => {
  try {
    const { wholesaler_id } = req.body;
    await db.query(
      `INSERT INTO broker_wholesalers (broker_id, wholesaler_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
      [req.params.id, wholesaler_id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to assign wholesaler" });
  }
});

// DELETE unassign wholesaler from broker
router.delete("/brokers/:id/wholesalers/:wid", async (req, res) => {
  try {
    await db.query(
      `DELETE FROM broker_wholesalers WHERE broker_id=$1 AND wholesaler_id=$2`,
      [req.params.id, req.params.wid]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to unassign wholesaler" });
  }
});


// ═══════════════════════════════════════════════════
// FACTORIES
// ═══════════════════════════════════════════════════

// GET all factories
router.get("/factories", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        f.id, f.name, f.city, f.contact_number, f.is_active,
        COUNT(DISTINCT bf.broker_id) AS broker_count,
        COUNT(DISTINCT t.id)         AS trade_count
      FROM factories f
      LEFT JOIN broker_factories bf ON bf.factory_id = f.id
      LEFT JOIN trades           t  ON t.factory_id  = f.id
      GROUP BY f.id
      ORDER BY f.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("FACTORY LOAD ERROR:", err);
    res.status(500).json({ error: "Failed to load factories", details: err.message });
  }
});

// POST create factory
router.post("/factories", async (req, res) => {
  try {
    const { name, city, contact_number } = req.body;
    if (!name) return res.status(400).json({ error: "Factory name required" });
    const result = await db.query(
      `INSERT INTO factories (name, city, contact_number, is_active)
       VALUES ($1,$2,$3,true) RETURNING *`,
      [name, city||null, contact_number||null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("FACTORY CREATE ERROR:", err);
    res.status(500).json({ error: "Failed to create factory" });
  }
});

// PUT update factory
router.put("/factories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, city, contact_number, is_active } = req.body;

    const fields = [];
    const vals   = [];
    let   idx    = 1;

    if (name           !== undefined) { fields.push(`name=$${idx++}`);           vals.push(name); }
    if (city           !== undefined) { fields.push(`city=$${idx++}`);           vals.push(city||null); }
    if (contact_number !== undefined) { fields.push(`contact_number=$${idx++}`); vals.push(contact_number||null); }
    if (is_active      !== undefined) { fields.push(`is_active=$${idx++}`);      vals.push(is_active); }

    if (!fields.length) return res.status(400).json({ error: "Nothing to update" });

    vals.push(id);
    await db.query(`UPDATE factories SET ${fields.join(",")} WHERE id=$${idx}`, vals);
    res.json({ success: true });
  } catch (err) {
    console.error("FACTORY UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update factory" });
  }
});


// ═══════════════════════════════════════════════════
// WHOLESALERS
// ═══════════════════════════════════════════════════

// GET all wholesalers
router.get("/wholesalers", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        w.id, w.name, w.mobile, w.whatsapp_number, w.city, w.is_active,
        COUNT(DISTINCT bw.broker_id) AS broker_count,
        COUNT(DISTINCT t.id)         AS trade_count
      FROM wholesalers w
      LEFT JOIN broker_wholesalers bw ON bw.wholesaler_id = w.id
      LEFT JOIN trades             t  ON t.wholesaler_id  = w.id
      GROUP BY w.id
      ORDER BY w.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("WHOLESALER LOAD ERROR:", err);
    res.status(500).json({ error: "Failed to load wholesalers", details: err.message });
  }
});

// POST create wholesaler
router.post("/wholesalers", async (req, res) => {
  try {
    const { name, mobile, whatsapp_number, city } = req.body;
    if (!name || !mobile) return res.status(400).json({ error: "Name and mobile required" });
    const result = await db.query(
      `INSERT INTO wholesalers (name, mobile, whatsapp_number, city, is_active)
       VALUES ($1,$2,$3,$4,true) RETURNING *`,
      [name, mobile, whatsapp_number||mobile, city||null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("WHOLESALER CREATE ERROR:", err);
    res.status(500).json({ error: err.message.includes("unique") ? "Mobile already exists" : "Failed to create wholesaler" });
  }
});

// PUT update wholesaler
router.put("/wholesalers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, whatsapp_number, city, is_active } = req.body;

    const fields = [];
    const vals   = [];
    let   idx    = 1;

    if (name             !== undefined) { fields.push(`name=$${idx++}`);             vals.push(name); }
    if (mobile           !== undefined) { fields.push(`mobile=$${idx++}`);           vals.push(mobile); }
    if (whatsapp_number  !== undefined) { fields.push(`whatsapp_number=$${idx++}`);  vals.push(whatsapp_number||mobile); }
    if (city             !== undefined) { fields.push(`city=$${idx++}`);             vals.push(city||null); }
    if (is_active        !== undefined) { fields.push(`is_active=$${idx++}`);        vals.push(is_active); }

    if (!fields.length) return res.status(400).json({ error: "Nothing to update" });

    vals.push(id);
    await db.query(`UPDATE wholesalers SET ${fields.join(",")} WHERE id=$${idx}`, vals);
    res.json({ success: true });
  } catch (err) {
    console.error("WHOLESALER UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update wholesaler" });
  }
});


// ═══════════════════════════════════════════════════
// COMMODITIES
// ═══════════════════════════════════════════════════

// GET all commodities
router.get("/commodities", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, name, category, unit, is_active
      FROM commodities
      ORDER BY name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("COMMODITY LOAD ERROR:", err);
    res.status(500).json({ error: "Failed to load commodities", details: err.message });
  }
});

// POST create commodity
router.post("/commodities", async (req, res) => {
  try {
    const { name, category, unit } = req.body;
    if (!name) return res.status(400).json({ error: "Commodity name required" });
    const result = await db.query(
      `INSERT INTO commodities (name, category, unit, is_active)
       VALUES ($1,$2,$3,true) RETURNING *`,
      [name, category||'cattle_feed', unit||null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error("COMMODITY CREATE ERROR:", err);
    res.status(500).json({ error: "Failed to create commodity" });
  }
});

// PUT update commodity
router.put("/commodities/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, unit, is_active } = req.body;

    const fields = [];
    const vals   = [];
    let   idx    = 1;

    if (name      !== undefined) { fields.push(`name=$${idx++}`);      vals.push(name); }
    if (category  !== undefined) { fields.push(`category=$${idx++}`);  vals.push(category); }
    if (unit      !== undefined) { fields.push(`unit=$${idx++}`);      vals.push(unit||null); }
    if (is_active !== undefined) { fields.push(`is_active=$${idx++}`); vals.push(is_active); }

    if (!fields.length) return res.status(400).json({ error: "Nothing to update" });

    vals.push(id);
    await db.query(`UPDATE commodities SET ${fields.join(",")} WHERE id=$${idx}`, vals);
    res.json({ success: true });
  } catch (err) {
    console.error("COMMODITY UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update commodity" });
  }
});


module.exports = router;