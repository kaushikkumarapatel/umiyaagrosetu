// middleware/brokerAuth.js

function requireBroker(req, res, next) {
  if (req.session && req.session.brokerId) {
    return next();
  }

  // API routes → always return JSON 401 (check by URL, not Accept header)
  const url = req.originalUrl || req.url || '';
  if (url.startsWith('/api/')) {
    return res.status(401).json({ error: 'Broker login required' });
  }

  // Page requests → redirect to login
  return res.redirect('/broker/login');
}

module.exports = requireBroker;