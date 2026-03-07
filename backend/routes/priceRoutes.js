const express = require("express");
const router = express.Router();
const db = require("../db");

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

module.exports = router;