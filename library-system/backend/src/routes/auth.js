// /api/auth - register, log in and get the current user.
const express = require('express');
const { validateRegistration } = require('../utils/validation');
const { hashPassword, verifyPassword } = require('../utils/password');
const { createToken, requireLogin } = require('../middleware/auth');

const router = express.Router();

function toPublicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// POST /api/auth/register  { name, email, password }
router.post('/register', (req, res) => {
  const db = req.app.locals.db;
  const errors = validateRegistration(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const name = req.body.name.trim();
  const email = req.body.email.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'This email is already registered' });
  }

  const result = db
    .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, hashPassword(req.body.password));

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json({ user: toPublicUser(user) });
});

// POST /api/auth/login  { email, password }
router.post('/login', (req, res) => {
  const db = req.app.locals.db;
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  return res.json({ token: createToken(user), user: toPublicUser(user) });
});

// GET /api/auth/me
router.get('/me', requireLogin, (req, res) => {
  const user = req.app.locals.db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user: toPublicUser(user) });
});

module.exports = router;
