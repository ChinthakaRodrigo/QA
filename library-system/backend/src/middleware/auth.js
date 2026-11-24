// Login tokens (JWT) and route guards.
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'library-dev-secret';

function createToken(user) {
  return jwt.sign({ id: user.id, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
}

// Lets the request through only if it has a valid "Authorization: Bearer <token>" header.
// The user is re-read from the database, so a deleted user or a changed role takes effect at once.
function requireLogin(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Please log in first' });
  }

  let payload;
  try {
    payload = jwt.verify(header.slice(7), JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Your session is invalid or has expired' });
  }

  const user = req.app.locals.db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(payload.id);
  if (!user) {
    return res.status(401).json({ error: 'This account no longer exists' });
  }
  req.user = user;
  return next();
}

// Use after requireLogin. Lets only admin users through.
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can do this' });
  }
  return next();
}

module.exports = { createToken, requireLogin, requireAdmin };
