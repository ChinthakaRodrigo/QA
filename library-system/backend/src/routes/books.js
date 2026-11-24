// /api/books - list, search, view, add, edit and delete books.
const express = require('express');
const { validateBook, normalizeIsbn, parseId } = require('../utils/validation');
const { requireLogin, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Every book row also gets "available" = copies minus books currently on loan.
const SELECT_BOOKS = `
  SELECT b.*,
         b.copies - (SELECT COUNT(*) FROM loans l
                     WHERE l.book_id = b.id AND l.returned_at IS NULL) AS available
  FROM books b`;

function findBook(db, id) {
  return db.prepare(`${SELECT_BOOKS} WHERE b.id = ?`).get(id);
}

function countActiveLoans(db, bookId) {
  return db
    .prepare('SELECT COUNT(*) AS count FROM loans WHERE book_id = ? AND returned_at IS NULL')
    .get(bookId).count;
}

// Reads and checks the book fields from the request body. Returns { book } or { errors }.
function readBookFromRequest(req) {
  const year = req.app.locals.now().getFullYear();
  const errors = validateBook(req.body, year);
  if (errors.length > 0) return { errors };

  const { title, author, isbn, year: published, copies } = req.body;
  return {
    book: { title: title.trim(), author: author.trim(), isbn: normalizeIsbn(isbn), year: published, copies },
  };
}

// GET /api/books?search=clean
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

  let books;
  if (search) {
    const pattern = `%${search}%`;
    books = db
      .prepare(`${SELECT_BOOKS} WHERE b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ? ORDER BY b.title`)
      .all(pattern, pattern, pattern);
  } else {
    books = db.prepare(`${SELECT_BOOKS} ORDER BY b.title`).all();
  }
  res.json({ books });
});

// GET /api/books/:id
router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid book id' });

  const book = findBook(req.app.locals.db, id);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  return res.json({ book });
});

// POST /api/books  (admin only)
router.post('/', requireLogin, requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const { book, errors } = readBookFromRequest(req);
  if (errors) return res.status(400).json({ error: 'Validation failed', details: errors });

  if (db.prepare('SELECT id FROM books WHERE isbn = ?').get(book.isbn)) {
    return res.status(409).json({ error: 'A book with this ISBN already exists' });
  }

  const result = db
    .prepare('INSERT INTO books (title, author, isbn, year, copies) VALUES (?, ?, ?, ?, ?)')
    .run(book.title, book.author, book.isbn, book.year, book.copies);

  return res.status(201).json({ book: findBook(db, result.lastInsertRowid) });
});

// PUT /api/books/:id  (admin only)
router.put('/:id', requireLogin, requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid book id' });
  if (!findBook(db, id)) return res.status(404).json({ error: 'Book not found' });

  const { book, errors } = readBookFromRequest(req);
  if (errors) return res.status(400).json({ error: 'Validation failed', details: errors });

  if (db.prepare('SELECT id FROM books WHERE isbn = ? AND id != ?').get(book.isbn, id)) {
    return res.status(409).json({ error: 'A book with this ISBN already exists' });
  }

  const onLoan = countActiveLoans(db, id);
  if (book.copies < onLoan) {
    return res.status(400).json({ error: `Copies cannot be less than the ${onLoan} copies currently on loan` });
  }

  db.prepare('UPDATE books SET title = ?, author = ?, isbn = ?, year = ?, copies = ? WHERE id = ?')
    .run(book.title, book.author, book.isbn, book.year, book.copies, id);

  return res.json({ book: findBook(db, id) });
});

// DELETE /api/books/:id  (admin only)
router.delete('/:id', requireLogin, requireAdmin, (req, res) => {
  const db = req.app.locals.db;
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Invalid book id' });
  if (!findBook(db, id)) return res.status(404).json({ error: 'Book not found' });

  if (countActiveLoans(db, id) > 0) {
    return res.status(409).json({ error: 'This book cannot be deleted while copies are on loan' });
  }

  db.prepare('DELETE FROM books WHERE id = ?').run(id);
  return res.status(204).send();
});

module.exports = router;
