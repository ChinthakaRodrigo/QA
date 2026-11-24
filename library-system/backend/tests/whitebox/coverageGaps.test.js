// White-box tests for the branches that no other suite reached (docs/04-white-box-testing.md, section 4.6).
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createApp } = require('../../src/app');
const { createDatabase, seedDatabase } = require('../../src/db');
const { createTestApp, loginAs, ADMIN, validBook } = require('../helpers');

const countRows = (db, table) => db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get().count;

test('WB-58 app.js: createApp uses the real clock when none is given', async () => {
  const db = createDatabase();
  seedDatabase(db);
  const app = createApp(db);
  const token = await loginAs(app, ADMIN);
  const addBook = (year) =>
    request(app).post('/api/books').set('Authorization', `Bearer ${token}`).send({ ...validBook, year });

  const thisYear = new Date().getFullYear();
  expect((await addBook(thisYear + 1)).status).toBe(400);
  expect((await addBook(thisYear)).status).toBe(201);
});

test('WB-59 db.js: createDatabase opens an empty in-memory database by default', () => {
  const db = createDatabase();
  expect(countRows(db, 'users')).toBe(0);
  db.close();
});

test('WB-60 db.js: data in a file survives a restart and is not seeded twice', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'library-test-'));
  const file = path.join(folder, 'library.db');
  try {
    const first = createDatabase(file);
    seedDatabase(first);
    first.close();

    const second = createDatabase(file);
    seedDatabase(second);
    expect(countRows(second, 'users')).toBe(2);
    expect(countRows(second, 'books')).toBe(5);
    second.close();
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('WB-61 auth.js: login without a request body', async () => {
  const { app } = createTestApp();
  const res = await request(app).post('/api/auth/login');
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Email and password are required');
});
