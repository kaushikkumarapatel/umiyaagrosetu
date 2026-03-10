require("dotenv").config();

const express       = require("express");
const session       = require("express-session");
const path          = require("path");
const pool          = require("./db");

const requireAdmin  = require("./middleware/adminAuth");
const requireBroker = require("./middleware/brokerAuth");

// ── Route imports ─────────────────────────────────
const commodityRoutes   = require("./routes/commodityRoutes");
const priceRoutes       = require("./routes/priceRoutes");
const broadcastRoutes   = require("./routes/broadcastRoutes");
const factoryRoutes     = require("./routes/factoryRoutes");
const visitorRoutes     = require("./routes/visitorRoutes");
const adminBrokerRoutes = require("./routes/adminBrokerRoutes");
const brokerRoutes      = require("./routes/brokerRoutes");

const app = express();
app.use(express.json());

/* ─────────────────────────────
   SESSION
───────────────────────────── */
app.use(session({
  secret:            process.env.SESSION_SECRET || "agrosetu-secret-change-in-prod",
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge:   8 * 60 * 60 * 1000,
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
  },
}));

/* ─────────────────────────────
   BLOCK DIRECT FILE ACCESS
───────────────────────────── */
app.use((req, res, next) => {
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
  if (blocked.includes(req.path.toLowerCase())) {
    return res.redirect("/admin/login");
  }
  next();
});

/* ─────────────────────────────
   ADMIN PAGES
───────────────────────────── */
app.get("/admin/login", (req, res) => {
  if (req.session.isAdmin) return res.redirect("/admin");
  res.sendFile(path.join(__dirname, "public/login.html"));
});

app.post("/admin/login", (req, res) => {
  const { password } = req.body;
  if (!process.env.ADMIN_PASSWORD) {
    return res.status(500).json({ error: "ADMIN_PASSWORD not set in .env" });
  }
  if (password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }
  res.status(401).json({ error: "Invalid password" });
});

app.get("/admin/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin/login");
});

// Protected admin pages
app.get("/admin",         requireAdmin, (req, res) => res.sendFile(path.join(__dirname, "public/admin.html")));
app.get("/admin/brokers", requireAdmin, (req, res) => res.redirect("/admin")); // merged into admin.html

/* ─────────────────────────────
   BROKER PAGES
───────────────────────────── */
app.get("/broker/login", (req, res) => {
  if (req.session.brokerId) return res.redirect("/broker/dashboard");
  res.sendFile(path.join(__dirname, "public/broker-login.html"));
});

app.get("/broker/dashboard",  requireBroker, (req, res) => res.sendFile(path.join(__dirname, "public/broker-dashboard.html")));
app.get("/broker/entry",      requireBroker, (req, res) => res.sendFile(path.join(__dirname, "public/broker-entry.html")));
app.get("/broker/trade/new",  requireBroker, (req, res) => res.redirect("/broker/entry")); // old URL -> new
app.get("/broker/trades",     requireBroker, (req, res) => res.sendFile(path.join(__dirname, "public/broker-trades.html")));
app.get("/broker/report",     requireBroker, (req, res) => res.sendFile(path.join(__dirname, "public/broker-report.html")));

/* ─────────────────────────────
   STATIC FILES
───────────────────────────── */
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "../frontend")));

/* ─────────────────────────────
   PUBLIC API ROUTES
───────────────────────────── */
app.use("/api", commodityRoutes);
app.use("/api", priceRoutes);
app.use("/api", broadcastRoutes);
app.use("/api", factoryRoutes);
app.use("/api", visitorRoutes);

app.get("/api/visitor", (req, res) => {
  const ip        = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"];
  res.json({ ip, userAgent });
});

/* ─────────────────────────────
   PROTECTED API ROUTES
───────────────────────────── */
app.use("/api/admin",  requireAdmin,  adminBrokerRoutes);
app.use("/api/broker", brokerRoutes);

/* ─────────────────────────────
   MISC
───────────────────────────── */
app.get("/", (req, res) => res.send("Commodity Broker API Running 🚀"));

app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ─────────────────────────────
   START
───────────────────────────── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));