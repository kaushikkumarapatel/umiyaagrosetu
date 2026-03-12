require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const pool = require("./db");

const requireAdmin = require("./middleware/adminAuth");
const requireBroker = require("./middleware/brokerAuth");

/* ───────── ROUTE IMPORTS ───────── */

const commodityRoutes  = require("./routes/commodityRoutes");
const priceRoutes      = require("./routes/priceRoutes");
const broadcastRoutes  = require("./routes/broadcastRoutes");
const factoryRoutes    = require("./routes/factoryRoutes");
const visitorRoutes    = require("./routes/visitorRoutes");
const brokerRoutes     = require("./routes/brokerRoutes");
const adminRoutes      = require("./routes/adminRoutes");
const masterDataRoutes = require("./routes/admin/masterDataRoutes");

const app = express();

/* ───────── BODY PARSER ───────── */

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ───────── SESSION ───────── */

app.use(session({
  secret:            process.env.SESSION_SECRET || "agrosetu-secret-change-in-prod",
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge:   8 * 60 * 60 * 1000,
    httpOnly: true,
    secure:   false,   // keep false for localhost
  },
}));

/* ───────── DEBUG LOGGER ───────── */

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

/* ───────── STATIC FILES ───────── */

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "../frontend")));

/* ───────── BLOCK DIRECT FILE ACCESS ───────── */

app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  const blocked = [
    "/price-entry.html",
    "/admin.html",
    "/admin-brokers.html",
    "/broker-login.html",
    "/broker-dashboard.html",
    "/broker-trade.html",
    "/broker-entry.html",
    "/broker-trades.html",
    "/broker-report.html",
  ];
  if (blocked.includes(req.path.toLowerCase())) return res.redirect("/admin/login");
  next();
});

/* ───────── ADMIN AUTH PAGES ───────── */

app.get("/admin/login", (req, res) => {
  if (req.session.isAdmin) return res.redirect("/admin");
  res.sendFile(path.join(__dirname, "public/login.html"));
});

app.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD)
    return res.status(500).json({ error: "ADMIN_PASSWORD not set" });
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return req.session.save(err => {
      if (err) return res.status(500).json({ error: "Session save failed" });
      res.json({ success: true });
    });
  }
  res.status(401).json({ error: "Invalid password" });
});

app.get("/admin/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin/login");
});

/* ───────── ADMIN PAGES ───────── */

app.get("/admin", requireAdmin, (req, res) =>
  res.sendFile(path.join(__dirname, "public/admin.html"))
);
app.get("/admin/brokers", requireAdmin, (req, res) => res.redirect("/admin"));

/* ───────── BROKER LOGIN ───────── */

app.get("/broker/login", (req, res) => {
  if (req.session.brokerId) return res.redirect("/broker/dashboard");
  res.sendFile(path.join(__dirname, "public/broker-login.html"));
});

app.post("/broker/login", async (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) return res.redirect("/broker/login?error=missing");
  try {
    const bcrypt = require("bcrypt");
    const result = await pool.query(
      `SELECT * FROM brokers WHERE mobile=$1 AND is_active=true`, [mobile]
    );
    if (!result.rows.length) return res.redirect("/broker/login?error=invalid");
    const broker = result.rows[0];
    const match = await bcrypt.compare(password, broker.password_hash);
    if (!match) return res.redirect("/broker/login?error=invalid");
    req.session.brokerId   = broker.id;
    req.session.brokerName = broker.name;
    req.session.save(err => {
      if (err) return res.redirect("/broker/login?error=session");
      res.redirect("/broker/dashboard");
    });
  } catch (err) {
    console.error("[broker login]", err.message);
    res.redirect("/broker/login?error=server");
  }
});

/* ───────── BROKER PAGES ───────── */

app.get("/broker/dashboard", requireBroker, (req, res) =>
  res.sendFile(path.join(__dirname, "public/broker-dashboard.html"))
);
app.get("/broker/entry",     requireBroker, (req, res) =>
  res.sendFile(path.join(__dirname, "public/broker-entry.html"))
);
app.get("/broker/trade/new", requireBroker, (req, res) => res.redirect("/broker/entry"));
app.get("/broker/trades",    requireBroker, (req, res) =>
  res.sendFile(path.join(__dirname, "public/broker-trades.html"))
);
app.get("/broker/report",    requireBroker, (req, res) =>
  res.sendFile(path.join(__dirname, "public/broker-report.html"))
);

/* ───────── ADMIN API ROUTES ───────── */

app.use("/api/admin", requireAdmin, masterDataRoutes);  // all master data CRUD

/* ───────── PUBLIC API ROUTES ───────── */

app.use("/api", commodityRoutes);
app.use("/api", priceRoutes);
app.use("/api", broadcastRoutes);
app.use("/api", factoryRoutes);
app.use("/api", visitorRoutes);

/* ───────── BROKER API ROUTES ───────── */

app.use("/api/broker", brokerRoutes);

/* ───────── MISC ───────── */

app.get("/", (req, res) => res.send("Commodity Broker API Running 🚀"));

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/debug-session", (req, res) => res.json(req.session));

/* ───────── START ───────── */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));