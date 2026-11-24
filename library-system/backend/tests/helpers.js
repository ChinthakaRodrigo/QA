// Shared test setup: a fresh in-memory database with demo data and a controllable clock.
const request = require('supertest');
const { createDatabase, seedDatabase } = require('../src/db');
const { createApp } = require('../src/app');

const ADMIN = { email: 'admin@library.com', password: 'Admin123' };
const MEMBER = { email: 'jane@library.com', password: 'Member123' };

function createTestApp() {
  const db = createDatabase(':memory:');
  seedDatabase(db);

  let currentTime = new Date('2026-03-01T10:00:00Z');
  const clock = {
    now: () => currentTime,
    set: (isoString) => {
      currentTime = new Date(isoString);
    },
  };

  const app = createApp(db, { now: clock.now });
  return { app, db, clock };
}

async function loginAs(app, { email, password }) {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token;
}

const validBook = {
  title: 'Introduction to Algorithms',
  author: 'Thomas H. Cormen',
  isbn: '978-0-262-03384-8',
  year: 2009,
  copies: 2,
};

module.exports = { createTestApp, loginAs, ADMIN, MEMBER, validBook };
