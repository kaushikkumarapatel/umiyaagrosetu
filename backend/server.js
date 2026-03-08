require("dotenv").config();

const express = require("express");
const pool = require("./db");
const path = require("path");

const commodityRoutes = require("./routes/commodityRoutes");
const priceRoutes = require("./routes/priceRoutes");
const broadcastRoutes = require("./routes/broadcastRoutes");
const factoryRoutes = require("./routes/factoryRoutes");
const visitorRoutes = require("./routes/visitorRoutes");


const app = express();

app.use(express.json());

// Serve HTML pages
app.get("/admin", (req,res)=>{ res.sendFile(path.join(__dirname,"public/price-entry.html"));
});
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "../frontend")));

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
app.use("/api", visitorRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

//google SEO API call
app.get("/api/visitor", (req,res)=>{

const ip =
req.headers['x-forwarded-for'] ||
req.socket.remoteAddress;

const userAgent = req.headers['user-agent'];

res.json({
ip,
userAgent
});

});