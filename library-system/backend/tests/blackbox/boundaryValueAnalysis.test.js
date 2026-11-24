// Black-box technique 2: Boundary Value Analysis (docs/03-black-box-testing.md, section 3.3)
// Three-value BVA: just below, on, and just above every boundary (where such a value exists).
const { setUp, MEMBER, BOOK, validBook } = require('./blackboxHelpers');

let api;
let clock;
let adminToken;
beforeEach(async () => {
  ({ api, clock, adminToken } = await setUp()); // "today" is 2026-03-01T10:00:00Z
});

const CREATED = 201;
const REJECTED = 400;

const DUE = '2026-03-15T10:00:00.000Z'; // a book borrowed "today" is due 14 days later
const HOUR = 60 * 60; // in seconds
const DAY = 24 * HOUR;
const secondsAfterDue = (seconds) => new Date(Date.parse(DUE) + seconds * 1000).toISOString();

describe('BVA-A Publication year: 1450 to the current year (F-04)', () => {
  test.each([
    ['BVA-01', 1449, REJECTED],
    ['BVA-02', 1450, CREATED],
    ['BVA-03', 1451, CREATED],
    ['BVA-04', 2025, CREATED],
    ['BVA-05', 2026, CREATED],
    ['BVA-06', 2027, REJECTED],
  ])('%s year %i -> %i', async (_id, year, status) => {
    expect((await api.addBook({ year })).status).toBe(status);
  });

  test('BVA-07 the upper limit moves with the calendar: in 2027, 2027 is accepted and 2028 is not', async () => {
    clock.set('2027-06-01T10:00:00Z');
    expect((await api.addBook({ year: 2027 })).status).toBe(CREATED);
    expect((await api.addBook({ year: 2028, isbn: '0306406152' })).status).toBe(REJECTED);
  });
});

describe('BVA-B Copies: 1 to 50 (F-04)', () => {
  test.each([
    ['BVA-08', 0, REJECTED],
    ['BVA-09', 1, CREATED],
    ['BVA-10', 2, CREATED],
    ['BVA-11', 49, CREATED],
    ['BVA-12', 50, CREATED],
    ['BVA-13', 51, REJECTED],
  ])('%s copies %i -> %i', async (_id, copies, status) => {
    expect((await api.addBook({ copies })).status).toBe(status);
  });
});

describe('BVA-C Copies cannot go below the number on loan (F-04)', () => {
  test.each([
    ['BVA-14', 1, REJECTED],
    ['BVA-15', 2, 200],
    ['BVA-16', 3, 200],
  ])('%s 2 copies on loan, set copies to %i -> %i', async (_id, copies, status) => {
    expect((await api.borrow(BOOK.cleanCode)).status).toBe(CREATED);
    expect((await api.borrow(BOOK.cleanCode, adminToken)).status).toBe(CREATED);
    expect((await api.editBook(BOOK.cleanCode, { ...validBook, copies })).status).toBe(status);
  });
});

describe('BVA-D Active loans: at most 3 (F-05)', () => {
  test.each([
    ['BVA-17', 1, CREATED],
    ['BVA-18', 2, CREATED],
    ['BVA-19', 3, REJECTED],
  ])('%s already holding %i, borrow one more -> %i', async (_id, held, status) => {
    const books = [BOOK.cleanCode, BOOK.pragmatic, BOOK.designPatterns];
    for (const bookId of books.slice(0, held)) {
      expect((await api.borrow(bookId)).status).toBe(CREATED);
    }
    expect((await api.borrow(BOOK.refactoring)).status).toBe(status);
  });
});

describe('BVA-E Due date and overdue status (F-05, F-07)', () => {
  test('BVA-20 due date is exactly 14 days after borrowing', async () => {
    expect((await api.borrow(BOOK.cleanCode)).body.loan.due_at).toBe(DUE);
  });

  test.each([
    ['BVA-21', '1 second before the due time', -1, 'borrowed'],
    ['BVA-22', 'exactly at the due time', 0, 'borrowed'],
    ['BVA-23', '1 second after the due time', 1, 'overdue'],
  ])('%s %s', async (_id, _when, seconds, status) => {
    await api.borrow(BOOK.cleanCode);
    clock.set(secondsAfterDue(seconds));
    expect((await api.myLoans())[0].status).toBe(status);
  });

  test.each([
    ['BVA-24', 'leap year', '2028-02-15T10:00:00Z', '2028-02-29T10:00:00.000Z'],
    ['BVA-25', 'non-leap year', '2027-02-15T10:00:00Z', '2027-03-01T10:00:00.000Z'],
    ['BVA-26', 'year end', '2026-12-18T10:00:00Z', '2027-01-01T10:00:00.000Z'],
  ])('%s calendar boundary: %s', async (_id, _when, borrowed, due) => {
    clock.set(borrowed);
    expect((await api.borrow(BOOK.cleanCode)).body.loan.due_at).toBe(due);
  });
});

describe('BVA-F Late fine: $1 per started day, capped at $20 (F-06)', () => {
  test.each([
    ['BVA-27', '1 second early', -1, 0],
    ['BVA-28', 'exactly on time', 0, 0],
    ['BVA-29', '1 second late', 1, 1],
    ['BVA-30', 'exactly 1 day late', DAY, 1],
    ['BVA-31', '1 day + 1 second late', DAY + 1, 2],
    ['BVA-32', '19 days late', 19 * DAY, 19],
    ['BVA-33', '20 days late', 20 * DAY, 20],
    ['BVA-34', '20 days + 1 second late', 20 * DAY + 1, 20],
    ['BVA-35', '21 days late', 21 * DAY, 20],
  ])('%s %s', async (_id, _when, seconds, fine) => {
    const { loan } = (await api.borrow(BOOK.cleanCode)).body;
    clock.set(secondsAfterDue(seconds));
    const res = await api.giveBack(loan.id);
    expect(res.status).toBe(200);
    expect(res.body.loan.fine).toBe(fine);
  });
});

describe('BVA-G Field lengths (F-01, F-04)', () => {
  const person = { name: 'Sam Reader', email: 'sam@test.com', password: 'Reader123' };

  test.each([
    ['BVA-36', 7, REJECTED],
    ['BVA-37', 8, CREATED],
    ['BVA-38', 9, CREATED],
  ])('%s password of %i characters -> %i', async (_id, length, status) => {
    const password = 'a1'.padEnd(length, 'x');
    expect((await api.register({ ...person, password })).status).toBe(status);
  });

  test.each([
    ['BVA-39', 0, REJECTED],
    ['BVA-40', 1, CREATED],
    ['BVA-41', 49, CREATED],
    ['BVA-42', 50, CREATED],
    ['BVA-43', 51, REJECTED],
  ])('%s name of %i characters -> %i', async (_id, length, status) => {
    expect((await api.register({ ...person, name: 'n'.repeat(length) })).status).toBe(status);
  });

  test.each([
    ['BVA-44', 'title', 0, REJECTED],
    ['BVA-45', 'title', 1, CREATED],
    ['BVA-46', 'title', 199, CREATED],
    ['BVA-47', 'title', 200, CREATED],
    ['BVA-48', 'title', 201, REJECTED],
    ['BVA-49', 'author', 0, REJECTED],
    ['BVA-50', 'author', 1, CREATED],
    ['BVA-51', 'author', 99, CREATED],
    ['BVA-52', 'author', 100, CREATED],
    ['BVA-53', 'author', 101, REJECTED],
  ])('%s %s of %i characters -> %i', async (_id, field, length, status) => {
    expect((await api.addBook({ [field]: 'x'.repeat(length) })).status).toBe(status);
  });

  test.each([
    ['BVA-54', 9, REJECTED],
    ['BVA-55', 10, CREATED],
    ['BVA-56', 11, REJECTED],
    ['BVA-57', 12, REJECTED],
    ['BVA-58', 13, CREATED],
    ['BVA-59', 14, REJECTED],
  ])('%s ISBN of %i digits -> %i', async (_id, length, status) => {
    expect((await api.addBook({ isbn: '9'.repeat(length) })).status).toBe(status);
  });
});

describe('BVA-H Login session: valid for 8 hours (F-02)', () => {
  afterEach(() => jest.restoreAllMocks());

  test.each([
    ['BVA-60', '1 second before 8 hours', 8 * HOUR - 1, 200],
    ['BVA-61', '1 second after 8 hours', 8 * HOUR + 1, 401],
  ])('%s %s', async (_id, _when, seconds, status) => {
    const loginTime = Date.parse('2026-03-01T10:00:00Z');
    const systemTime = jest.spyOn(Date, 'now').mockReturnValue(loginTime);
    const { token } = (await api.login(MEMBER)).body;

    systemTime.mockReturnValue(loginTime + seconds * 1000);
    expect((await api.me(token)).status).toBe(status);
  });
});
