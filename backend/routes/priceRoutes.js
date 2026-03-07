const express = require("express");
const router = express.Router();
const db = require("../db");
const pool = require("../db");

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
router.get("/prices/all", async (req, res) => {

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

router.put("/prices/:id", async (req,res)=>{

  const {id} = req.params;
  const {price} = req.body;

  await pool.query(
    `UPDATE daily_prices SET price=$1 WHERE id=$2`,
    [price,id]
  );

  res.json({success:true});

});

router.delete("/prices/:id", async (req,res)=>{

  const {id} = req.params;

  await pool.query(
    `DELETE FROM daily_prices WHERE id=$1`,
    [id]
  );

  res.json({success:true});

});


module.exports = router;