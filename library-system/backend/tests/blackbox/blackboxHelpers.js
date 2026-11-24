// Shared helpers for the black-box suites. Everything goes through the public REST API;
// expected results come from the README business rules, not from the source code.
const request = require('supertest');
const { createTestApp, loginAs, ADMIN, MEMBER, validBook } = require('../helpers');

// Ids of the demo data
const BOOK = { cleanCode: 1, pragmatic: 2, designPatterns: 3, refactoring: 4, ddd: 5 };
const SINGLE_COPY_BOOK = BOOK.designPatterns;
const ADMIN_ID = 1;
const JANE_ID = 2;

// A test for a defect that is still open. It asserts the CORRECT behaviour, so it is expected to fail.
// When the defect is fixed Jest reports an error here: change knownDefect(...) back to test(...).
// Set the environment variable SHOW_DEFECTS=1 to run these as normal (red) tests.
const knownDefect = process.env.SHOW_DEFECTS ? test : test.failing;

async function setUp() {
  const { app, clock } = createTestApp(); // clock starts at 2026-03-01T10:00:00Z
  const adminToken = await loginAs(app, ADMIN);
  const memberToken = await loginAs(app, MEMBER);

  // token: a login token, or undefined for a guest
  const call = (method, url, token, body) => {
    const req = request(app)[method](url);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return body === undefined ? req : req.send(body);
  };

  const api = {
    register: (user) => call('post', '/api/auth/register', undefined, user),
    login: (body) => call('post', '/api/auth/login', undefined, body),
    me: (token) => call('get', '/api/auth/me', token),
    searchBooks: (search) => request(app).get('/api/books').query({ search }),
    getBook: (id) => call('get', `/api/books/${id}`),
    addBook: (changes) => call('post', '/api/books', adminToken, { ...validBook, ...changes }),
    editBook: (id, book) => call('put', `/api/books/${id}`, adminToken, book),
    borrow: (bookId, token = memberToken) => call('post', '/api/loans', token, { bookId }),
    borrowAsGuest: (bookId) => call('post', '/api/loans', undefined, { bookId }),
    giveBack: (loanId) => call('post', `/api/loans/${loanId}/return`, memberToken),
    myLoans: async () => (await call('get', '/api/loans/my', memberToken)).body.loans,
    getUser: (id) => call('get', `/api/users/${id}`, adminToken),
    deleteUser: (id, token) => call('delete', `/api/users/${id}`, token),
  };
  return { app, clock, api, adminToken, memberToken };
}

module.exports = { setUp, knownDefect, MEMBER, BOOK, SINGLE_COPY_BOOK, ADMIN_ID, JANE_ID, validBook };
