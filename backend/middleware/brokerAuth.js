// middleware/brokerAuth.js
// Protects all /broker/* routes — requires broker session

function requireBroker(req, res, next) {
  if (req.session && req.session.brokerId) {
    return next(); // ✅ logged in broker
  }
  // API call → return 401 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'Broker login required' });
  }
  // Page request → redirect to login
  res.redirect('/broker/login');
}

module.exports = requireBroker;