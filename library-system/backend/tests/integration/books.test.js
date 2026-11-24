const request = require('supertest');
const { createTestApp, loginAs, ADMIN, MEMBER, validBook } = require('../helpers');

let app;
let adminToken;
let memberToken;

beforeEach(async () => {
  ({ app } = createTestApp());
  adminToken = await loginAs(app, ADMIN);
  memberToken = await loginAs(app, MEMBER);
});

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
const asMember = (req) => req.set('Authorization', `Bearer ${memberToken}`);

describe('GET /api/books', () => {
  test('lists all books sorted by title, with available copies', async () => {
    const res = await request(app).get('/api/books');
    expect(res.status).toBe(200);
    expect(res.body.books).toHaveLength(5);
    expect(res.body.books[0].title).toBe('Clean Code');
    expect(res.body.books[0].available).toBe(3);
  });

  test.each([
    ['fowler', 'Refactoring'], // by author, case-insensitive
    ['Design', 'Design Patterns'], // by title (also matches Domain-Driven Design)
    ['9780132350884', 'Clean Code'], // by ISBN
  ])('search "%s" finds "%s"', async (search, title) => {
    const res = await request(app).get('/api/books').query({ search });
    expect(res.body.books.map((b) => b.title)).toContain(title);
  });

  test('search with no match returns an empty list', async () => {
    const res = await request(app).get('/api/books').query({ search: 'zzzz' });
    expect(res.body.books).toEqual([]);
  });
});

describe('GET /api/books/:id', () => {
  test('returns one book', async () => {
    const res = await request(app).get('/api/books/1');
    expect(res.status).toBe(200);
    expect(res.body.book.title).toBe('Clean Code');
  });

  test('404 for a missing book', async () => {
    expect((await request(app).get('/api/books/999')).status).toBe(404);
  });

  test('400 for an invalid id', async () => {
    expect((await request(app).get('/api/books/abc')).status).toBe(400);
  });
});

describe('POST /api/books', () => {
  test('admin can add a book (ISBN dashes are removed)', async () => {
    const res = await asAdmin(request(app).post('/api/books')).send(validBook);
    expect(res.status).toBe(201);
    expect(res.body.book).toMatchObject({ title: validBook.title, isbn: '9780262033848', available: 2 });
  });

  test('member cannot add a book', async () => {
    const res = await asMember(request(app).post('/api/books')).send(validBook);
    expect(res.status).toBe(403);
  });

  test('guest cannot add a book', async () => {
    const res = await request(app).post('/api/books').send(validBook);
    expect(res.status).toBe(401);
  });

  test('rejects invalid data', async () => {
    const res = await asAdmin(request(app).post('/api/books')).send({ ...validBook, year: 3000, copies: 0 });
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveLength(2);
  });

  test('rejects a duplicate ISBN', async () => {
    const res = await asAdmin(request(app).post('/api/books')).send({ ...validBook, isbn: '9780132350884' });
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/books/:id', () => {
  const update = { title: 'Clean Code (2nd ed.)', author: 'Robert C. Martin', isbn: '9780132350884', year: 2025, copies: 5 };

  test('admin can edit a book', async () => {
    const res = await asAdmin(request(app).put('/api/books/1')).send(update);
    expect(res.status).toBe(200);
    expect(res.body.book).toMatchObject({ title: 'Clean Code (2nd ed.)', copies: 5, available: 5 });
  });

  test('member cannot edit a book', async () => {
    expect((await asMember(request(app).put('/api/books/1')).send(update)).status).toBe(403);
  });

  test('404 for a missing book', async () => {
    expect((await asAdmin(request(app).put('/api/books/999')).send(update)).status).toBe(404);
  });

  test('400 for an invalid id', async () => {
    expect((await asAdmin(request(app).put('/api/books/x')).send(update)).status).toBe(400);
  });

  test('400 for invalid data', async () => {
    expect((await asAdmin(request(app).put('/api/books/1')).send({ ...update, title: '' })).status).toBe(400);
  });

  test('cannot use the ISBN of another book', async () => {
    const res = await asAdmin(request(app).put('/api/books/1')).send({ ...update, isbn: '9780201633610' });
    expect(res.status).toBe(409);
  });

  test('cannot set copies below the number on loan', async () => {
    await asMember(request(app).post('/api/loans')).send({ bookId: 1 });
    await asAdmin(request(app).post('/api/loans')).send({ bookId: 1 });
    const res = await asAdmin(request(app).put('/api/books/1')).send({ ...update, copies: 1 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/2 copies currently on loan/);
  });
});

describe('DELETE /api/books/:id', () => {
  test('admin can delete a book', async () => {
    expect((await asAdmin(request(app).delete('/api/books/2'))).status).toBe(204);
    expect((await request(app).get('/api/books/2')).status).toBe(404);
  });

  test('member cannot delete a book', async () => {
    expect((await asMember(request(app).delete('/api/books/2'))).status).toBe(403);
  });

  test('cannot delete a book that is on loan', async () => {
    await asMember(request(app).post('/api/loans')).send({ bookId: 2 });
    expect((await asAdmin(request(app).delete('/api/books/2'))).status).toBe(409);
  });

  test('can delete a book after it was returned (history is removed too)', async () => {
    const loan = await asMember(request(app).post('/api/loans')).send({ bookId: 2 });
    await asMember(request(app).post(`/api/loans/${loan.body.loan.id}/return`));
    expect((await asAdmin(request(app).delete('/api/books/2'))).status).toBe(204);
  });

  test('404 for a missing book and 400 for an invalid id', async () => {
    expect((await asAdmin(request(app).delete('/api/books/999'))).status).toBe(404);
    expect((await asAdmin(request(app).delete('/api/books/0'))).status).toBe(400);
  });
});
