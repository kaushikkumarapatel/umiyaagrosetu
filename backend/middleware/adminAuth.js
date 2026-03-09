// middleware/adminAuth.js
// Simple session-based password protection for /admin routes
// Password is stored in .env — never hardcoded

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next(); // ✅ logged in — allow through
  }
  // ❌ not logged in — redirect to login page
  res.redirect("/admin/login");
}

module.exports = requireAdmin;