function requireAdmin(req, res, next) {

  if (req.session && req.session.isAdmin) {
    return next();
  }

  // If API request → return JSON
  if (req.originalUrl.startsWith("/api/")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // If page request → redirect
  res.redirect("/admin/login");
}

module.exports = requireAdmin;