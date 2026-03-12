// middleware/brokerAuth.js

function requireBroker(req, res, next) {

  if (req.session && req.session.brokerId) {
    return next();
  }

  // If request expects JSON → return JSON
  if (req.headers.accept && req.headers.accept.includes("application/json")) {
    return res.status(401).json({ error: "Broker login required" });
  }

  // Otherwise treat as page request
  return res.redirect("/broker/login");
}

module.exports = requireBroker;