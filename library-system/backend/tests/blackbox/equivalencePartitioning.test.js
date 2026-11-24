// Black-box technique 1: Equivalence Partitioning (docs/03-black-box-testing.md, section 3.2)
// One representative value per class. Invalid classes are tested one at a time, with every other field valid.
const request = require('supertest');
const { setUp, knownDefect, BOOK } = require('./blackboxHelpers');

let app;
let api;
beforeEach(async () => {
  ({ app, api } = await setUp());
});

const person = { name: 'Sam Reader', email: 'sam@test.com', password: 'Reader123' };

const EMAIL_ERROR = 'A valid email is required';
const LENGTH_ERROR = 'Password must be at least 8 characters';
const MIX_ERROR = 'Password must contain at least one letter and one number';
const ISBN_ERROR = 'ISBN must be 10 or 13 digits';

describe('EP-A Registration: email (F-01)', () => {
  test.each([
    ['EP-01', 'simple address', 'sam@test.com', 'sam@test.com'],
    ['EP-02', 'upper case + surrounding spaces', '  SAM@Test.COM ', 'sam@test.com'],
    ['EP-03', 'plus tag and sub-domain', 'sam+lib@mail.test.com', 'sam+lib@mail.test.com'],
  ])('%s valid: %s', async (_id, _class, email, stored) => {
    const res = await api.register({ ...person, email });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(stored);
  });

  test.each([
    ['EP-04', 'missing', undefined],
    ['EP-05', 'only spaces', '   '],
    ['EP-06', 'no @', 'samtest.com'],
    ['EP-07', 'no local part', '@test.com'],
    ['EP-08', 'no top-level domain', 'sam@test'],
    ['EP-09', 'two @ signs', 'sam@x@test.com'],
    ['EP-10', 'space inside', 'sam reader@test.com'],
    ['EP-11', 'not text', 12345],
  ])('%s invalid: %s', async (_id, _class, email) => {
    const res = await api.register({ ...person, email });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([EMAIL_ERROR]);
  });

  test('EP-12 invalid: already registered (different letter case)', async () => {
    const res = await api.register({ ...person, email: 'JANE@library.com' });
    expect(res.status).toBe(409);
  });

  knownDefect.each([
    ['EP-13', 'consecutive dots in domain', 'sam@test..com'],
    ['EP-14', 'domain starts with a dot', 'sam@.test.com'],
  ])('%s invalid: %s [BB-03]', async (_id, _class, email) => {
    const res = await api.register({ ...person, email });
    expect(res.status).toBe(400);
  });
});

describe('EP-B Registration: password (F-01)', () => {
  test.each([
    ['EP-15', 'letters and digits', 'Reader123'],
    ['EP-16', 'letters, digits and symbols', 'Read#er-123!'],
  ])('%s valid: %s', async (_id, _class, password) => {
    expect((await api.register({ ...person, password })).status).toBe(201);
    expect((await api.login({ email: person.email, password })).status).toBe(200);
  });

  test.each([
    ['EP-17', 'missing', undefined, LENGTH_ERROR],
    ['EP-18', 'too short', 'Ab1', LENGTH_ERROR],
    ['EP-19', 'letters only', 'ReaderPass', MIX_ERROR],
    ['EP-20', 'digits only', '1234567890', MIX_ERROR],
    ['EP-21', 'symbols only', '!@#$%^&*()', MIX_ERROR],
    ['EP-22', 'not text', 1234567890, LENGTH_ERROR],
  ])('%s invalid: %s', async (_id, _class, password, message) => {
    const res = await api.register({ ...person, password });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([message]);
  });
});

describe('EP-C Add book: ISBN (F-04)', () => {
  test.each([
    ['EP-23', '10 digits', '0306406152', '0306406152'],
    ['EP-24', '13 digits', '9780306406157', '9780306406157'],
    ['EP-25', '13 digits with dashes', '978-0-306-40615-7', '9780306406157'],
    ['EP-26', '10 digits with spaces', '0 306 40615 2', '0306406152'],
  ])('%s valid: %s', async (_id, _class, isbn, stored) => {
    const res = await api.addBook({ isbn });
    expect(res.status).toBe(201);
    expect(res.body.book.isbn).toBe(stored);
  });

  test.each([
    ['EP-27', 'empty', ''],
    ['EP-28', 'fewer than 10 digits', '12345'],
    ['EP-29', '11 or 12 digits', '12345678901'],
    ['EP-30', 'more than 13 digits', '978030640615712'],
    ['EP-31', 'contains letters', '97803064O615A'],
    ['EP-32', 'unsupported separator', '978.0306406157'],
  ])('%s invalid: %s', async (_id, _class, isbn) => {
    const res = await api.addBook({ isbn });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([ISBN_ERROR]);
  });

  test('EP-33 invalid: already in the catalogue (written with dashes)', async () => {
    const res = await api.addBook({ isbn: '978-0-13-235088-4' }); // Clean Code
    expect(res.status).toBe(409);
  });
});

describe('EP-D Book search: keyword (F-03)', () => {
  const ALL = ['Clean Code', 'Design Patterns', 'Domain-Driven Design', 'Refactoring', 'The Pragmatic Programmer'];
  const titles = (res) => res.body.books.map((book) => book.title);

  test.each([
    ['EP-34', 'part of a title', 'design', ['Design Patterns', 'Domain-Driven Design']],
    ['EP-35', 'author, different letter case', 'FOWLER', ['Refactoring']],
    ['EP-36', 'full ISBN', '9780132350884', ['Clean Code']],
    ['EP-37', 'surrounding spaces', '  clean  ', ['Clean Code']],
    ['EP-38', 'empty keyword lists everything', '', ALL],
    ['EP-39', 'no matching book', 'zzzz', []],
    ['EP-40', 'SQL injection text', "' OR 1=1 --", []],
  ])('%s %s', async (_id, _class, keyword, expected) => {
    const res = await api.searchBooks(keyword);
    expect(res.status).toBe(200);
    expect(titles(res)).toEqual(expected);
  });

  // No demo book contains these characters, so nothing should be found.
  knownDefect.each([
    ['EP-41', 'percent sign', '%'],
    ['EP-42', 'underscore', '_'],
  ])('%s special character: %s [BB-01]', async (_id, _class, keyword) => {
    expect(titles(await api.searchBooks(keyword))).toEqual([]);
  });

  knownDefect('EP-43 ISBN written with dashes [BB-02]', async () => {
    expect(titles(await api.searchBooks('978-0-13-235088-4'))).toEqual(['Clean Code']);
  });
});

describe('EP-E Borrow: bookId (F-05)', () => {
  test('EP-44 valid: id of an existing book', async () => {
    expect((await api.borrow(BOOK.cleanCode)).status).toBe(201);
  });

  test.each([
    ['EP-45', 'missing', undefined],
    ['EP-46', 'negative', -1],
    ['EP-47', 'decimal', 1.5],
    ['EP-48', 'text', 'abc'],
  ])('%s invalid: %s', async (_id, _class, bookId) => {
    expect((await api.borrow(bookId)).status).toBe(400);
    expect(await api.myLoans()).toEqual([]);
  });

  test('EP-49 invalid: no such book', async () => {
    expect((await api.borrow(999)).status).toBe(404);
  });

  knownDefect.each([
    ['EP-50', 'boolean', true],
    ['EP-51', 'list', [2]],
  ])('%s invalid: %s [BB-04]', async (_id, _class, bookId) => {
    expect((await api.borrow(bookId)).status).toBe(400);
  });
});

describe('EP-F Request format (F-09)', () => {
  const rawLogin = (text) =>
    request(app).post('/api/auth/login').set('Content-Type', 'application/json').send(text);

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {}); // the API logs unexpected errors
  });
  afterEach(() => jest.restoreAllMocks());

  test('EP-52 valid: JSON body', async () => {
    const res = await rawLogin('{"email":"jane@library.com","password":"Member123"}');
    expect(res.status).toBe(200);
  });

  test('EP-53 invalid: malformed JSON', async () => {
    expect((await rawLogin('{"email": ')).status).toBe(400);
  });

  test('EP-54 invalid: unknown route', async () => {
    expect((await request(app).get('/api/nothing')).status).toBe(404);
  });

  knownDefect('EP-55 invalid: body too large [BB-05]', async () => {
    const res = await rawLogin(JSON.stringify({ email: 'jane@library.com', password: 'x'.repeat(200000) }));
    expect(res.status).toBe(413);
  });

  knownDefect('EP-56 invalid: badly encoded URL [BB-06]', async () => {
    expect((await request(app).get('/api/books/%E0%A4%A')).status).toBe(400);
  });
});
