const request = require('supertest');
const { createTestApp, loginAs, ADMIN, MEMBER } = require('../helpers');

let app;
let clock;
let adminToken;
let memberToken;

beforeEach(async () => {
  ({ app, clock } = createTestApp()); // clock starts at 2026-03-01T10:00:00Z
  adminToken = await loginAs(app, ADMIN);
  memberToken = await loginAs(app, MEMBER);
});

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
const asMember = (req) => req.set('Authorization', `Bearer ${memberToken}`);
const borrow = (bookId, as = asMember) => as(request(app).post('/api/loans')).send({ bookId });
const giveBack = (loanId, as = asMember) => as(request(app).post(`/api/loans/${loanId}/return`));

describe('borrowing a book', () => {
  test('creates a loan due in 14 days and reduces available copies', async () => {
    const res = await borrow(1);
    expect(res.status).toBe(201);
    expect(res.body.loan).toMatchObject({
      book_title: 'Clean Code',
      status: 'borrowed',
      borrowed_at: '2026-03-01T10:00:00.000Z',
      due_at: '2026-03-15T10:00:00.000Z',
      returned_at: null,
    });

    const book = await request(app).get('/api/books/1');
    expect(book.body.book.available).toBe(2);
  });

  test('requires login', async () => {
    expect((await request(app).post('/api/loans').send({ bookId: 1 })).status).toBe(401);
  });

  test.each([undefined, 'abc', -1])('rejects invalid bookId %p', async (bookId) => {
    expect((await borrow(bookId)).status).toBe(400);
  });

  test('404 when the book does not exist', async () => {
    expect((await borrow(999)).status).toBe(404);
  });

  test('cannot borrow the same book twice', async () => {
    await borrow(1);
    const res = await borrow(1);
    expect(res.status).toBe(409);
  });

  test('cannot borrow when no copies are left', async () => {
    await borrow(3, asAdmin); // "Design Patterns" has only 1 copy
    const res = await borrow(3);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No copies/);
  });

  test('cannot hold more than 3 books', async () => {
    await borrow(1);
    await borrow(2);
    await borrow(3);
    const res = await borrow(4);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/more than 3/);
  });

  test('can borrow again after returning one (limit frees up)', async () => {
    const first = await borrow(1);
    await borrow(2);
    await borrow(3);
    await giveBack(first.body.loan.id);
    expect((await borrow(4)).status).toBe(201);
  });
});

describe('returning a book', () => {
  test('on time: no fine and the copy is available again', async () => {
    const loan = await borrow(1);
    clock.set('2026-03-10T10:00:00Z');
    const res = await giveBack(loan.body.loan.id);

    expect(res.status).toBe(200);
    expect(res.body.loan).toMatchObject({ status: 'returned', fine: 0, returned_at: '2026-03-10T10:00:00.000Z' });
    expect((await request(app).get('/api/books/1')).body.book.available).toBe(3);
  });

  test('late: $1 fine per day', async () => {
    const loan = await borrow(1);
    clock.set('2026-03-20T10:00:00Z'); // 5 days after the due date
    const res = await giveBack(loan.body.loan.id);
    expect(res.body.loan.fine).toBe(5);
  });

  test('very late: fine is capped at $20', async () => {
    const loan = await borrow(1);
    clock.set('2026-06-01T10:00:00Z');
    expect((await giveBack(loan.body.loan.id)).body.loan.fine).toBe(20);
  });

  test('cannot return the same loan twice', async () => {
    const loan = await borrow(1);
    await giveBack(loan.body.loan.id);
    expect((await giveBack(loan.body.loan.id)).status).toBe(400);
  });

  test("a member cannot return someone else's book", async () => {
    const loan = await borrow(1, asAdmin);
    expect((await giveBack(loan.body.loan.id)).status).toBe(403);
  });

  test("an admin can return a member's book", async () => {
    const loan = await borrow(1);
    expect((await giveBack(loan.body.loan.id, asAdmin)).status).toBe(200);
  });

  test('404 for a missing loan and 400 for an invalid id', async () => {
    expect((await giveBack(999)).status).toBe(404);
    expect((await giveBack('abc')).status).toBe(400);
  });
});

describe('viewing loans', () => {
  test('a member sees only their own loans, newest first', async () => {
    await borrow(1);
    await borrow(2);
    await borrow(4, asAdmin);
    const res = await asMember(request(app).get('/api/loans/my'));
    expect(res.status).toBe(200);
    expect(res.body.loans.map((l) => l.book_title)).toEqual(['The Pragmatic Programmer', 'Clean Code']);
  });

  test('a loan shows as overdue after the due date', async () => {
    await borrow(1);
    clock.set('2026-03-16T10:00:00Z');
    const res = await asMember(request(app).get('/api/loans/my'));
    expect(res.body.loans[0].status).toBe('overdue');
  });

  test('an admin can see all loans', async () => {
    await borrow(1);
    await borrow(2, asAdmin);
    const res = await asAdmin(request(app).get('/api/loans'));
    expect(res.status).toBe(200);
    expect(res.body.loans).toHaveLength(2);
    expect(res.body.loans.map((l) => l.user_name)).toEqual(['Admin User', 'Jane Member']);
  });

  test('a member cannot see all loans', async () => {
    expect((await asMember(request(app).get('/api/loans'))).status).toBe(403);
  });
});
