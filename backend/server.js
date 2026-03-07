require("dotenv").config();

const express = require("express");
const pool = require("./db");
const path = require("path");

const commodityRoutes = require("./routes/commodityRoutes");
const priceRoutes = require("./routes/priceRoutes");
const broadcastRoutes = require("./routes/broadcastRoutes");
const factoryRoutes = require("./routes/factoryRoutes");


const app = express();

app.use(express.json());

// Serve HTML pages
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.send("Commodity Broker API Running 🚀");
});

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// API routes
app.use("/api", commodityRoutes);
app.use("/api", priceRoutes);
app.use("/api", broadcastRoutes);
app.use("/api", factoryRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});