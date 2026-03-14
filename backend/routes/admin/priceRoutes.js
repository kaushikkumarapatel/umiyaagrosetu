const express = require("express");
const router = express.Router();
const pool = require("../../db");  // ← updated: routes/admin → backend root
const db = pool;

// ─── GET /api/prices?date=YYYY-MM-DD ────────────────
// All records with optional date filter (defaults to last 90 days)
router.get("/prices", async (req, res) => {
  try {
    const { date } = req.query;
    const whereClause = date
      ? `WHERE dp.price_date = $1`
      : `WHERE dp.price_date >= CURRENT_DATE - INTERVAL '90 days'`;
    const params = date ? [date] : [];
    const result = await pool.query(`
      SELECT
        dp.id, dp.price_date, dp.price, dp.remarks,
        dp.factory_id, dp.commodity_id,
        f.name AS factory_name,
        c.name AS commodity_name
      FROM daily_prices dp
      JOIN factories   f ON f.id = dp.factory_id
      JOIN commodities c ON c.id = dp.commodity_id
      ${whereClause}
      ORDER BY dp.price_date DESC, f.name, c.name
    `, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch prices" });
  }
});


router.post("/prices", async (req, res) => {

  const { prices } = req.body;

   // ✅ ADD VALIDATION HERE
  if (!Array.isArray(prices) || prices.length === 0) {
    return res.status(400).json({ error: "No prices received" });
  }

  try {

    for (const p of prices) {

       // Step-2 validation
      if (!p.factory_id || !p.commodity_id || !p.price || !p.price_date) {
        return res.status(400).json({ error: "Invalid price entry" });
      }

      await db.query(
        `
        INSERT INTO daily_prices
        (factory_id, commodity_id, price,remarks, price_date)

        VALUES ($1,$2,$3,$4,$5)

        ON CONFLICT (factory_id, commodity_id, price_date)
        DO UPDATE SET
        price = EXCLUDED.price,
        remarks = EXCLUDED.remarks
        `,
        [
          p.factory_id,
          p.commodity_id,
          p.price,
          p.remarks ? p.remarks.trim() : null,
          p.price_date
        ]
      );

    }

    res.json({ success: true });

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Failed to save prices" });

  }

});
router.get("/prices/history", async (req, res) => {

  const result = await pool.query(`
    SELECT 
      dp.id,
      dp.price_date,
      f.name AS factory,
      c.name AS commodity,
      dp.price
    FROM daily_prices dp
    JOIN factories f ON dp.factory_id = f.id
    JOIN commodities c ON dp.commodity_id = c.id
    ORDER BY dp.price_date DESC, f.name
  `);

  res.json(result.rows);

});

router.get("/prices/today", async (req, res) => {

  const result = await pool.query(`
    SELECT 
      dp.id,
      dp.price_date,
      f.name AS factory,
      c.name AS commodity,
      dp.price
    FROM daily_prices dp
    JOIN factories f ON dp.factory_id = f.id
    JOIN commodities c ON dp.commodity_id = c.id
    WHERE dp.price_date = CURRENT_DATE
    ORDER BY f.name
  `);

  res.json(result.rows);

});

router.put("/prices/:id", async (req, res) => {
  const { id } = req.params;
  const { price, remarks } = req.body;
  await pool.query(
    `UPDATE daily_prices SET price=$1, remarks=$2 WHERE id=$3`,
    [price, remarks ?? null, id]
  );
  res.json({ success: true });
});

router.delete("/prices/:id", async (req,res)=>{

  const {id} = req.params;

  await pool.query(
    `DELETE FROM daily_prices WHERE id=$1`,
    [id]
  );

  res.json({success:true});

});

router.get("/prices/latest", async (req, res) => {

try{

const result = await pool.query(`

SELECT DISTINCT ON (f.id, c.id)
c.name as commodity,
f.name as factory,
dp.price,
dp.price_date

FROM daily_prices dp
JOIN factories f ON dp.factory_id = f.id
JOIN commodities c ON dp.commodity_id = c.id

ORDER BY f.id, c.id, dp.price_date DESC

`);

res.json(result.rows);

}catch(err){

console.error(err);
res.status(500).json({error:"Failed to fetch prices"});

}

});

module.exports = router;