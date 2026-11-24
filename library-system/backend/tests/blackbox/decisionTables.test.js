// Black-box technique 3: Decision tables (docs/03-black-box-testing.md, section 3.4)
// Each rule (column) of a decision table is one test.
const { setUp, MEMBER, BOOK, SINGLE_COPY_BOOK, ADMIN_ID, JANE_ID } = require('./blackboxHelpers');

let api;
let adminToken;
let memberToken;
beforeEach(async () => {
  ({ api, adminToken, memberToken } = await setUp());
});

describe('DT1 Login (F-02)', () => {
  const MISSING = 'Email and password are required';
  const WRONG = 'Invalid email or password'; // same message for both cases, so accounts cannot be guessed

  test.each([
    ['DT1-R1', 'no email', { password: MEMBER.password }, 400, MISSING],
    ['DT1-R2', 'email but no password', { email: MEMBER.email }, 400, MISSING],
    ['DT1-R3', 'unknown account', { email: 'nobody@test.com', password: MEMBER.password }, 401, WRONG],
    ['DT1-R4', 'wrong password', { email: MEMBER.email, password: 'Wrong1234' }, 401, WRONG],
  ])('%s %s -> rejected', async (_id, _rule, body, status, message) => {
    const res = await api.login(body);
    expect(res.status).toBe(status);
    expect(res.body.error).toBe(message);
    expect(res.body.token).toBeUndefined();
  });

  test('DT1-R5 correct email and password -> token', async () => {
    const res = await api.login(MEMBER);
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.role).toBe('member');
  });
});

describe('DT2 Borrow a book (F-05)', () => {
  const holdThreeBooks = async () => {
    for (const id of [BOOK.cleanCode, BOOK.pragmatic, BOOK.refactoring]) {
      expect((await api.borrow(id)).status).toBe(201);
    }
  };
  const takeLastCopyAsAdmin = async () => {
    expect((await api.borrow(SINGLE_COPY_BOOK, adminToken)).status).toBe(201);
  };

  test('DT2-R1 not logged in -> 401', async () => {
    expect((await api.borrowAsGuest(BOOK.cleanCode)).status).toBe(401);
    expect((await api.getBook(BOOK.cleanCode)).body.book.available).toBe(3);
  });

  test('DT2-R2 invalid bookId -> 400', async () => {
    expect((await api.borrow('abc')).status).toBe(400);
    expect(await api.myLoans()).toEqual([]);
  });

  test('DT2-R3 book does not exist -> 404', async () => {
    expect((await api.borrow(999)).status).toBe(404);
    expect(await api.myLoans()).toEqual([]);
  });

  test('DT2-R4 already holds this book -> 409', async () => {
    expect((await api.borrow(BOOK.cleanCode)).status).toBe(201);
    expect((await api.borrow(BOOK.cleanCode)).status).toBe(409);
    expect(await api.myLoans()).toHaveLength(1);
  });

  test('DT2-R5 already holds 3 books -> 400', async () => {
    await holdThreeBooks();
    const res = await api.borrow(BOOK.ddd);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/more than 3 books/);
    expect(await api.myLoans()).toHaveLength(3);
  });

  test('DT2-R6 no copies available -> 400', async () => {
    await takeLastCopyAsAdmin();
    const res = await api.borrow(SINGLE_COPY_BOOK);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/No copies/);
    expect(await api.myLoans()).toEqual([]);
  });

  test('DT2-R7 every condition met -> loan created', async () => {
    const res = await api.borrow(BOOK.cleanCode);
    expect(res.status).toBe(201);
    expect(res.body.loan.status).toBe('borrowed');
    expect((await api.getBook(BOOK.cleanCode)).body.book.available).toBe(2);
  });

  // "Don't care" entries checked with the other value. The README does not say which
  // message wins when two rules are broken at once, so only the outcome is checked.
  test('DT2-R4b already holds this book AND holds 3 books -> rejected', async () => {
    await holdThreeBooks();
    expect([400, 409]).toContain((await api.borrow(BOOK.cleanCode)).status);
    expect(await api.myLoans()).toHaveLength(3);
  });

  test('DT2-R4c already holds this book AND it was the last copy -> rejected', async () => {
    expect((await api.borrow(SINGLE_COPY_BOOK)).status).toBe(201);
    expect([400, 409]).toContain((await api.borrow(SINGLE_COPY_BOOK)).status);
    expect(await api.myLoans()).toHaveLength(1);
  });

  test('DT2-R5b holds 3 books AND no copies available -> rejected', async () => {
    await takeLastCopyAsAdmin();
    await holdThreeBooks();
    expect((await api.borrow(SINGLE_COPY_BOOK)).status).toBe(400);
    expect(await api.myLoans()).toHaveLength(3);
  });
});

describe('DT3 Delete a user (F-10)', () => {
  const userExists = async (id) => (await api.getUser(id)).status === 200;

  test('DT3-R1 guest -> 401', async () => {
    expect((await api.deleteUser(JANE_ID)).status).toBe(401);
    expect(await userExists(JANE_ID)).toBe(true);
  });

  test('DT3-R2 member -> 403', async () => {
    expect((await api.deleteUser(ADMIN_ID, memberToken)).status).toBe(403);
    expect(await userExists(ADMIN_ID)).toBe(true);
  });

  test('DT3-R3 admin, invalid id -> 400', async () => {
    expect((await api.deleteUser('abc', adminToken)).status).toBe(400);
  });

  test('DT3-R4 admin, user does not exist -> 404', async () => {
    expect((await api.deleteUser(999, adminToken)).status).toBe(404);
  });

  test('DT3-R5 admin deletes own account -> 400', async () => {
    expect((await api.deleteUser(ADMIN_ID, adminToken)).status).toBe(400);
    expect(await userExists(ADMIN_ID)).toBe(true);
  });

  test('DT3-R6 admin, user has a book on loan -> 409', async () => {
    expect((await api.borrow(BOOK.cleanCode)).status).toBe(201);
    expect((await api.deleteUser(JANE_ID, adminToken)).status).toBe(409);
    expect(await userExists(JANE_ID)).toBe(true);
  });

  test('DT3-R7 admin, user never borrowed -> deleted', async () => {
    expect((await api.deleteUser(JANE_ID, adminToken)).status).toBe(204);
    expect(await userExists(JANE_ID)).toBe(false);
  });

  test('DT3-R7b admin, user returned every book -> deleted', async () => {
    const { loan } = (await api.borrow(BOOK.cleanCode)).body;
    expect((await api.giveBack(loan.id)).status).toBe(200);
    expect((await api.deleteUser(JANE_ID, adminToken)).status).toBe(204);
    expect(await userExists(JANE_ID)).toBe(false);
  });
});
