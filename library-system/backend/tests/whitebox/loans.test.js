// White-box tests: src/routes/loans.js and src/utils/loanRules.js (docs/04-white-box-testing.md)
// One test per basis path. "STMT" marks a set that is enough for 100 % statement coverage;
// the other tests are added for branch and condition coverage.
const request = require('supertest');
const { createTestApp, loginAs, ADMIN, MEMBER } = require('../helpers');
const { calculateDueDate, daysLate, calculateFine, getLoanStatus } = require('../../src/utils/loanRules');

const SINGLE_COPY_BOOK = 3;
const DUE = '2026-03-15T10:00:00.000Z';

describe('loans.js', () => {
  let app;
  let clock;
  let adminToken;
  let memberToken;
  beforeEach(async () => {
    ({ app, clock } = createTestApp()); // clock starts at 2026-03-01T10:00:00Z
    adminToken = await loginAs(app, ADMIN);
    memberToken = await loginAs(app, MEMBER);
  });

  const post = (url, token) => request(app).post(url).set('Authorization', `Bearer ${token}`);
  const list = (url, token) => request(app).get(url).set('Authorization', `Bearer ${token}`);
  const borrow = (bookId, token = memberToken) => post('/api/loans', token).send({ bookId });
  const giveBack = (loanId, token = memberToken) => post(`/api/loans/${loanId}/return`, token);
  const borrowOk = async (bookId, token) => {
    const res = await borrow(bookId, token);
    expect(res.status).toBe(201);
    return res.body.loan;
  };

  describe('borrow handler, V(G) = 7', () => {
    test('WB-01 path 1: no request body', async () => {
      const res = await post('/api/loans', memberToken);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A valid bookId is required');
    });

    test('WB-02 STMT path 2: invalid bookId', async () => {
      const res = await borrow('abc');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('A valid bookId is required');
    });

    test('WB-03 STMT path 3: book not found', async () => {
      expect((await borrow(999)).status).toBe(404);
    });

    test('WB-04 STMT path 4: already borrowed', async () => {
      await borrowOk(1);
      expect((await borrow(1)).status).toBe(409);
    });

    test('WB-05 STMT path 5: loan limit reached', async () => {
      for (const bookId of [1, 2, 4]) await borrowOk(bookId);
      const res = await borrow(5);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/more than 3/);
    });

    test('WB-06 STMT path 6: no copies left', async () => {
      await borrowOk(SINGLE_COPY_BOOK, adminToken);
      const res = await borrow(SINGLE_COPY_BOOK);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/No copies/);
    });

    test('WB-07 STMT path 7: loan created', async () => {
      expect(await borrowOk(1)).toMatchObject({ book_id: 1, status: 'borrowed', due_at: DUE, returned_at: null });
    });
  });

  describe('return handler, V(G) = 6', () => {
    test('WB-08 STMT path 1: invalid loan id', async () => {
      expect((await giveBack('abc')).status).toBe(400);
    });

    test('WB-09 STMT path 2: loan not found', async () => {
      expect((await giveBack(999)).status).toBe(404);
    });

    test('WB-10 STMT path 3: not the owner and not an admin', async () => {
      const loan = await borrowOk(1, adminToken);
      expect((await giveBack(loan.id)).status).toBe(403);
    });

    test('WB-11 path 4: not the owner, but an admin', async () => {
      const loan = await borrowOk(1);
      const res = await giveBack(loan.id, adminToken);
      expect(res.status).toBe(200);
      expect(res.body.loan.status).toBe('returned');
    });

    test('WB-12 STMT path 5: owner, already returned', async () => {
      const loan = await borrowOk(1);
      expect((await giveBack(loan.id)).status).toBe(200);
      const res = await giveBack(loan.id);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/already been returned/);
    });

    test('WB-13 STMT path 6: owner returns late and the fine is stored', async () => {
      const loan = await borrowOk(1);
      clock.set('2026-03-18T10:00:00Z');
      const res = await giveBack(loan.id);
      expect(res.status).toBe(200);
      expect(res.body.loan).toMatchObject({ status: 'returned', fine: 3, returned_at: '2026-03-18T10:00:00.000Z' });
    });
  });

  describe('list handlers, V(G) = 1 each', () => {
    test('WB-14 STMT my loans', async () => {
      await borrowOk(1);
      await borrowOk(2, adminToken);
      const res = await list('/api/loans/my', memberToken);
      expect(res.body.loans.map((loan) => loan.book_id)).toEqual([1]);
    });

    test('WB-15 STMT all loans', async () => {
      await borrowOk(1);
      await borrowOk(2, adminToken);
      const res = await list('/api/loans', adminToken);
      expect(res.body.loans.map((loan) => loan.book_id)).toEqual([2, 1]);
    });
  });
});

describe('loanRules.js, total V(G) = 7', () => {
  test('WB-16 STMT calculateDueDate: adds 14 days', () => {
    expect(calculateDueDate('2026-03-01T10:00:00.000Z').toISOString()).toBe(DUE);
  });

  test('WB-17 STMT daysLate: late branch, rounded up', () => {
    expect(daysLate(DUE, '2026-03-16T10:00:01.000Z')).toBe(2);
  });

  // Days early, not exactly on time: without the "diff > 0" check this would give a negative number.
  test('WB-18 daysLate: not-late branch', () => {
    expect(daysLate(DUE, '2026-03-10T10:00:00.000Z')).toBe(0);
  });

  test('WB-19 STMT calculateFine: below the cap', () => {
    expect(calculateFine(DUE, '2026-03-20T10:00:00.000Z')).toBe(5);
  });

  test('WB-20 calculateFine: above the cap', () => {
    expect(calculateFine(DUE, '2026-06-01T10:00:00.000Z')).toBe(20);
  });

  test('WB-21 STMT getLoanStatus: returned', () => {
    expect(getLoanStatus({ due_at: DUE, returned_at: '2026-03-10T10:00:00Z' }, '2026-05-01T10:00:00Z')).toBe('returned');
  });

  test('WB-22 STMT getLoanStatus: overdue', () => {
    expect(getLoanStatus({ due_at: DUE, returned_at: null }, '2026-03-16T10:00:00Z')).toBe('overdue');
  });

  test('WB-23 getLoanStatus: borrowed', () => {
    expect(getLoanStatus({ due_at: DUE, returned_at: null }, '2026-03-14T10:00:00Z')).toBe('borrowed');
  });
});
