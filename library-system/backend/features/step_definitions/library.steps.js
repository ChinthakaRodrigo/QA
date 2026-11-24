// Step definitions for borrowing.feature and returning.feature.
// Each step drives the real REST API (Express + in-memory SQLite) through Supertest.
const assert = require('node:assert/strict');
const { Given, When, Then } = require('@cucumber/cucumber');
const { LOAN_DAYS } = require('../../src/utils/loanRules');

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- Given ----------

Given('I am logged in as the member {string} with password {string}', async function (email, password) {
  const res = await this.api('post', '/api/auth/login').send({ email, password });
  assert.equal(res.status, 200, `login failed: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.user.role, 'member');
  this.token = res.body.token;
});

Given('the book {string} has {int} copies available', async function (title, available) {
  const book = await this.findBook(title);
  assert.equal(book.available, available);
});

Given('I have already borrowed these books:', async function (table) {
  for (const { title } of table.hashes()) {
    const res = await this.borrow(title);
    assert.equal(res.status, 201, `could not borrow "${title}": ${JSON.stringify(res.body)}`);
  }
});

Given('I have borrowed {string} today', async function (title) {
  const res = await this.borrow(title);
  assert.equal(res.status, 201, `could not borrow "${title}": ${JSON.stringify(res.body)}`);
});

Given('{int} days have passed since the due date', function (days) {
  const loan = Object.values(this.loansByTitle)[0];
  this.clock.set(new Date(new Date(loan.due_at).getTime() + days * DAY_MS).toISOString());
});

// ---------- When ----------

When('I borrow {string}', async function (title) {
  await this.borrow(title);
});

When('I return {string}', async function (title) {
  const loan = this.loansByTitle[title];
  this.response = await this.api('post', `/api/loans/${loan.id}/return`);
});

// ---------- Then ----------

Then('the loan is created with status {string}', function (status) {
  assert.equal(this.response.status, 201);
  assert.equal(this.response.body.loan.status, status);
});

Then('the book is due {int} days from today', function (days) {
  assert.equal(days, LOAN_DAYS);
  const expected = new Date(this.clock.now().getTime() + days * DAY_MS).toISOString();
  assert.equal(this.response.body.loan.due_at, expected);
});

Then('the request is refused with status {int}', function (status) {
  assert.equal(this.response.status, status);
});

Then('I see the error {string}', function (message) {
  assert.equal(this.response.body.error, message);
});

Then('I have {int} books on loan', async function (count) {
  const res = await this.api('get', '/api/loans/my');
  assert.equal(res.body.loans.filter((l) => l.status !== 'returned').length, count);
});

Then('the loan status is {string}', function (status) {
  assert.equal(this.response.status, 200, JSON.stringify(this.response.body));
  assert.equal(this.response.body.loan.status, status);
});

Then('I am charged a fine of ${int}', function (fine) {
  assert.equal(this.response.body.loan.fine, fine);
});
