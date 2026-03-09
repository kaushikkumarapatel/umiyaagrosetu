require("dotenv").config();

const express      = require("express");
const session      = require("express-session");
const pool         = require("./db");
const path         = require("path");
const requireAdmin = require("./middleware/adminAuth");

const commodityRoutes = require("./routes/commodityRoutes");
const priceRoutes     = require("./routes/priceRoutes");
const broadcastRoutes = require("./routes/broadcastRoutes");
const factoryRoutes   = require("./routes/factoryRoutes");
const visitorRoutes   = require("./routes/visitorRoutes");

const app = express();

app.use(express.json());

// ── SESSION SETUP ────────────────────────────────────
app.use(session({
  secret:            process.env.SESSION_SECRET || "agrosetu-secret-change-in-prod",
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000, // 8 hours — expires after one working day
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" // HTTPS only in prod
  }
}));

// ── ADMIN LOGIN ROUTES ───────────────────────────────

// GET /admin/login — show login page
app.get("/admin/login", (req, res) => {
  if (req.session.isAdmin) return res.redirect("/admin"); // already logged in
  res.sendFile(path.join(__dirname, "public/login.html"));
});

// POST /admin/login — check password
app.post("/admin/login", (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error("⚠️  ADMIN_PASSWORD not set in .env");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  if (password === adminPassword) {
    req.session.isAdmin = true;
    return res.status(200).json({ success: true });
  }

  res.status(401).json({ error: "Invalid password" });
});

// GET /admin/logout
app.get("/admin/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/admin/login");
});

// ── PROTECTED ADMIN PANEL ────────────────────────────
// requireAdmin middleware checks session before serving price-entry.html
app.get("/admin", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "public/price-entry.html"));
});

// ── BLOCK DIRECT ACCESS TO price-entry.html ──────────
// Must be BEFORE express.static — otherwise static serves it freely
app.use((req, res, next) => {
  if (req.path.toLowerCase() === "/price-entry.html") {
    return res.redirect("/admin/login");
  }
  next();
});

// ── STATIC FILES ─────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "../frontend")));

// ── PUBLIC ROUTES ────────────────────────────────────
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

// ── API ROUTES ────────────────────────────────────────
app.use("/api", commodityRoutes);
app.use("/api", priceRoutes);
app.use("/api", broadcastRoutes);
app.use("/api", factoryRoutes);
app.use("/api", visitorRoutes);
app.use("/api/broadcast", broadcastRoutes);

// Visitor logging
app.get("/api/visitor", (req, res) => {
  const ip        = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  const userAgent = req.headers["user-agent"];
  res.json({ ip, userAgent });
});

// ── START SERVER ──────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});