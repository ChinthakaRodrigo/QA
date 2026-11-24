const request = require('supertest');
const { createTestApp, loginAs, ADMIN, MEMBER } = require('../helpers');

let app;
beforeEach(() => {
  ({ app } = createTestApp());
});

describe('POST /api/auth/register', () => {
  const newUser = { name: 'Sam Reader', email: 'Sam@Test.com', password: 'Reader123' };

  test('creates a member account', async () => {
    const res = await request(app).post('/api/auth/register').send(newUser);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Sam Reader', email: 'sam@test.com', role: 'member' });
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  test('the new user can log in', async () => {
    await request(app).post('/api/auth/register').send(newUser);
    const res = await request(app).post('/api/auth/login').send({ email: 'sam@test.com', password: 'Reader123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  test('cannot make yourself an admin', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...newUser, role: 'admin' });
    expect(res.body.user.role).toBe('member');
  });

  test('rejects invalid data with details', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: '', email: 'bad', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveLength(3);
  });

  test('rejects an email that is already used (case-insensitive)', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...newUser, email: 'JANE@library.com' });
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  test('returns a token and the user', async () => {
    const res = await request(app).post('/api/auth/login').send(ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: ADMIN.email, role: 'admin' });
  });

  test('rejects a wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: ADMIN.email, password: 'wrong123' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  test('gives the same message for an unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'x1234567' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  test('requires email and password', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  test('returns the logged-in user', async () => {
    const token = await loginAs(app, MEMBER);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(MEMBER.email);
  });

  test('requires a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('rejects a fake token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  test('returns 404 if the user was deleted', async () => {
    const { app: freshApp, db } = createTestApp();
    const token = await loginAs(freshApp, MEMBER);
    db.prepare('DELETE FROM users WHERE email = ?').run(MEMBER.email);
    const res = await request(freshApp).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe('general API behaviour', () => {
  test('health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('unknown route returns 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });

  test('invalid JSON returns 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Request body is not valid JSON');
  });
});
