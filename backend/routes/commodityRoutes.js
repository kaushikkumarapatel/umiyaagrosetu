const express = require("express");
const router = express.Router();
const db = require("../db");

router.get("/commodities", async (req, res) => {

  try {

    const result = await db.query(
      "SELECT id, name FROM commodities ORDER BY name"
    );

    res.json(result.rows);

  } catch (err) {

    console.error(err);
    res.status(500).json({ error: "Failed to fetch commodities" });

  }

});

module.exports = router;