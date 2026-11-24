// /api/users - user management (CRUD). Admin only.
const express = require('express');
const { validateUser, parseId } = require('../utils/validation');
const { hashPassword } = require('../utils/password');
const { requireLogin, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireLogin, requireAdmin);

// Never returns password hashes. "active_loans" = books the user has not returned yet.
const SELECT_USERS = `
  SELECT u.id, u.name, u.email, u.role,
         (SELECT COUNT(*) FROM loans l WHERE l.user_id = u.id AND l.returned_at IS NULL) AS active_loans
  FROM users u`;

function findUser(db, id) {
  return db.prepare(`${SELECT_USERS} WHERE u.id = ?`).get(id);
}

function emailTaken(db, email, exceptId = 0) {
  return Boolean(db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email, exceptId));
}

// GET /api/users?search=jane
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  let users;
  if (search) {
    const pattern = `%${search}%`;
    users = db.prepare(`${SELECT_USERS} WHERE u.name LIKE ? OR u.email LIKE ? ORDER BY u.name`).all(pattern, pattern);
  } else {
    users = db.prepare(`${SELECT_USERS} ORDER BY u.name`).all();
  }
  res.json({ users });
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid user id' });

  const user = findUser(req.app.locals.db, id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user });
});

// POST /api/users  { name, email, password, role }
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const errors = validateUser(req.body, { isNew: true });
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

  const { name, email, password, role } = req.body;
  const cleanEmail = email.trim().toLowerCase();
  if (emailTaken(db, cleanEmail)) return res.status(409).json({ error: 'This email is already registered' });

  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(name.trim(), cleanEmail, hashPassword(password), role);

  return res.status(201).json({ user: findUser(db, result.lastInsertRowid) });
});

// PUT /api/users/:id  { name, email, role, password? }  (empty password = keep the old one)
router.put('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid user id' });
  if (!findUser(db, id)) return res.status(404).json({ error: 'User not found' });

  const errors = validateUser(req.body, { isNew: false });
  if (errors.length > 0) return res.status(400).json({ error: 'Validation failed', details: errors });

  const { name, email, password, role } = req.body;
  const cleanEmail = email.trim().toLowerCase();
  if (emailTaken(db, cleanEmail, id)) return res.status(409).json({ error: 'This email is already registered' });

  if (id === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'You cannot remove your own admin role' });
  }

  db.prepare('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?').run(name.trim(), cleanEmail, role, id);
  if (password) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), id);
  }

  return res.json({ user: findUser(db, id) });
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid user id' });

  const user = findUser(db, id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  if (user.active_loans > 0) {
    return res.status(409).json({ error: 'This user cannot be deleted while they have books on loan' });
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return res.status(204).send();
});

module.exports = router;
