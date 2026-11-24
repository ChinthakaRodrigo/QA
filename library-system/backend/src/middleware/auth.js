// Login tokens (JWT) and route guards.
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'library-dev-secret';

function createToken(user) {
  return jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
}

// Lets the request through only if it has a valid "Authorization: Bearer <token>" header.
function requireLogin(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please log in first' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: 'Your session is invalid or has expired' });
  }
}

// Use after requireLogin. Lets only admin users through.
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can do this' });
  }
  return next();
}

module.exports = { createToken, requireLogin, requireAdmin };
