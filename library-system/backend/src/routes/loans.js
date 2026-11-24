// /api/loans - borrow and return books. All routes need a logged-in user.
const express = require('express');
const { parseId } = require('../utils/validation');
const { requireLogin, requireAdmin } = require('../middleware/auth');
const { MAX_ACTIVE_LOANS, calculateDueDate, calculateFine, getLoanStatus } = require('../utils/loanRules');

const router = express.Router();
router.use(requireLogin);

const SELECT_LOANS = `
  SELECT l.*, b.title AS book_title, u.name AS user_name
  FROM loans l
  JOIN books b ON b.id = l.book_id
  JOIN users u ON u.id = l.user_id`;

// Adds the "status" field (borrowed / overdue / returned) to each loan.
function withStatus(loans, now) {
  return loans.map((loan) => ({ ...loan, status: getLoanStatus(loan, now) }));
}

// GET /api/loans/my - loans of the logged-in user
router.get('/my', (req, res) => {
  const { db, now } = req.app.locals;
  const loans = db.prepare(`${SELECT_LOANS} WHERE l.user_id = ? ORDER BY l.id DESC`).all(req.user.id);
  res.json({ loans: withStatus(loans, now()) });
});

// GET /api/loans - every loan in the library (admin only)
router.get('/', requireAdmin, (req, res) => {
  const { db, now } = req.app.locals;
  const loans = db.prepare(`${SELECT_LOANS} ORDER BY l.id DESC`).all();
  res.json({ loans: withStatus(loans, now()) });
});

// POST /api/loans  { bookId } - borrow a book
router.post('/', (req, res) => {
  const { db, now } = req.app.locals;
  const bookId = parseId(req.body?.bookId);
  if (!bookId) return res.status(400).json({ error: 'A valid bookId is required' });

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
  if (!book) return res.status(404).json({ error: 'Book not found' });

  const alreadyBorrowed = db
    .prepare('SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND returned_at IS NULL')
    .get(req.user.id, bookId);
  if (alreadyBorrowed) return res.status(409).json({ error: 'You already have this book' });

  const { count: activeLoans } = db
    .prepare('SELECT COUNT(*) AS count FROM loans WHERE user_id = ? AND returned_at IS NULL')
    .get(req.user.id);
  if (activeLoans >= MAX_ACTIVE_LOANS) {
    return res.status(400).json({ error: `You cannot borrow more than ${MAX_ACTIVE_LOANS} books at a time` });
  }

  const { count: onLoan } = db
    .prepare('SELECT COUNT(*) AS count FROM loans WHERE book_id = ? AND returned_at IS NULL')
    .get(bookId);
  if (onLoan >= book.copies) {
    return res.status(400).json({ error: 'No copies of this book are available right now' });
  }

  const borrowedAt = now();
  const result = db
    .prepare('INSERT INTO loans (user_id, book_id, borrowed_at, due_at) VALUES (?, ?, ?, ?)')
    .run(req.user.id, bookId, borrowedAt.toISOString(), calculateDueDate(borrowedAt).toISOString());

  const loan = db.prepare(`${SELECT_LOANS} WHERE l.id = ?`).get(result.lastInsertRowid);
  return res.status(201).json({ loan: withStatus([loan], borrowedAt)[0] });
});

// POST /api/loans/:id/return - return a borrowed book (owner or admin)
router.post('/:id/return', (req, res) => {
  const { db, now } = req.app.locals;
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid loan id' });

  const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });

  if (loan.user_id !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'You can only return your own books' });
  }
  if (loan.returned_at) return res.status(400).json({ error: 'This book has already been returned' });

  const returnedAt = now();
  const fine = calculateFine(loan.due_at, returnedAt);
  db.prepare('UPDATE loans SET returned_at = ?, fine = ? WHERE id = ?').run(returnedAt.toISOString(), fine, id);

  const updated = db.prepare(`${SELECT_LOANS} WHERE l.id = ?`).get(id);
  return res.json({ loan: withStatus([updated], returnedAt)[0] });
});

module.exports = router;
