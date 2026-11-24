const request = require('supertest');
const { createTestApp, loginAs, ADMIN, MEMBER } = require('../helpers');

let app;
let adminToken;
let memberToken;

beforeEach(async () => {
  ({ app } = createTestApp()); // seeded: 1 = Admin User, 2 = Jane Member
  adminToken = await loginAs(app, ADMIN);
  memberToken = await loginAs(app, MEMBER);
});

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
const asMember = (req) => req.set('Authorization', `Bearer ${memberToken}`);

const newUser = { name: 'Tom Reader', email: 'Tom@Test.com', password: 'Reader123', role: 'member' };

describe('access control', () => {
  test('guests get 401', async () => {
    expect((await request(app).get('/api/users')).status).toBe(401);
  });

  test.each([
    ['get', '/api/users'],
    ['get', '/api/users/1'],
    ['post', '/api/users'],
    ['put', '/api/users/1'],
    ['delete', '/api/users/1'],
  ])('members get 403 for %s %s', async (method, url) => {
    expect((await asMember(request(app)[method](url)).send(newUser)).status).toBe(403);
  });
});

describe('GET /api/users (Read)', () => {
  test('lists all users sorted by name, without password hashes', async () => {
    const res = await asAdmin(request(app).get('/api/users'));
    expect(res.status).toBe(200);
    expect(res.body.users.map((u) => u.name)).toEqual(['Admin User', 'Jane Member']);
    expect(res.body.users[0]).not.toHaveProperty('password_hash');
  });

  test('searches by name or email', async () => {
    const byName = await asAdmin(request(app).get('/api/users').query({ search: 'jane' }));
    expect(byName.body.users.map((u) => u.email)).toEqual(['jane@library.com']);

    const byEmail = await asAdmin(request(app).get('/api/users').query({ search: 'admin@' }));
    expect(byEmail.body.users.map((u) => u.name)).toEqual(['Admin User']);
  });

  test('shows how many books each user has on loan', async () => {
    await asMember(request(app).post('/api/loans')).send({ bookId: 1 });
    const res = await asAdmin(request(app).get('/api/users/2'));
    expect(res.body.user).toMatchObject({ name: 'Jane Member', active_loans: 1 });
  });

  test('404 for a missing user and 400 for an invalid id', async () => {
    expect((await asAdmin(request(app).get('/api/users/999'))).status).toBe(404);
    expect((await asAdmin(request(app).get('/api/users/abc'))).status).toBe(400);
  });
});

describe('POST /api/users (Create)', () => {
  test('creates a user who can then log in', async () => {
    const res = await asAdmin(request(app).post('/api/users')).send(newUser);
    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({ name: 'Tom Reader', email: 'tom@test.com', role: 'member', active_loans: 0 });

    const login = await request(app).post('/api/auth/login').send({ email: 'tom@test.com', password: 'Reader123' });
    expect(login.status).toBe(200);
  });

  test('can create another admin', async () => {
    const res = await asAdmin(request(app).post('/api/users')).send({ ...newUser, role: 'admin' });
    expect(res.body.user.role).toBe('admin');
  });

  test('rejects invalid data', async () => {
    const res = await asAdmin(request(app).post('/api/users')).send({ name: '', email: 'x', password: '1', role: 'boss' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([
      'Name is required',
      'A valid email is required',
      'Role must be member or admin',
      'Password must be at least 8 characters',
    ]);
  });

  test('rejects an email that is already used', async () => {
    const res = await asAdmin(request(app).post('/api/users')).send({ ...newUser, email: 'JANE@library.com' });
    expect(res.status).toBe(409);
  });
});

describe('PUT /api/users/:id (Update)', () => {
  const janeUpdate = { name: 'Jane Smith', email: 'jane.smith@library.com', role: 'member', password: '' };

  test('updates name and email and keeps the old password when it is empty', async () => {
    const res = await asAdmin(request(app).put('/api/users/2')).send(janeUpdate);
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ name: 'Jane Smith', email: 'jane.smith@library.com' });

    const login = await request(app).post('/api/auth/login').send({ email: 'jane.smith@library.com', password: 'Member123' });
    expect(login.status).toBe(200);
  });

  test('sets a new password when one is given', async () => {
    await asAdmin(request(app).put('/api/users/2')).send({ ...janeUpdate, password: 'NewPass99' });
    const login = await request(app).post('/api/auth/login').send({ email: 'jane.smith@library.com', password: 'NewPass99' });
    expect(login.status).toBe(200);
  });

  test('promoting a member to admin takes effect immediately', async () => {
    expect((await asMember(request(app).get('/api/users'))).status).toBe(403);
    await asAdmin(request(app).put('/api/users/2')).send({ ...janeUpdate, role: 'admin' });
    expect((await asMember(request(app).get('/api/users'))).status).toBe(200);
  });

  test('rejects a weak new password', async () => {
    const res = await asAdmin(request(app).put('/api/users/2')).send({ ...janeUpdate, password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(['Password must be at least 8 characters']);
  });

  test('rejects an email used by another user', async () => {
    const res = await asAdmin(request(app).put('/api/users/2')).send({ ...janeUpdate, email: 'admin@library.com' });
    expect(res.status).toBe(409);
  });

  test('an admin cannot remove their own admin role', async () => {
    const res = await asAdmin(request(app).put('/api/users/1'))
      .send({ name: 'Admin User', email: 'admin@library.com', role: 'member' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('You cannot remove your own admin role');
  });

  test('an admin can edit their own name', async () => {
    const res = await asAdmin(request(app).put('/api/users/1'))
      .send({ name: 'Head Librarian', email: 'admin@library.com', role: 'admin' });
    expect(res.status).toBe(200);
  });

  test('404 for a missing user and 400 for an invalid id', async () => {
    expect((await asAdmin(request(app).put('/api/users/999')).send(janeUpdate)).status).toBe(404);
    expect((await asAdmin(request(app).put('/api/users/x')).send(janeUpdate)).status).toBe(400);
  });
});

describe('DELETE /api/users/:id (Delete)', () => {
  test('deletes a user, who can no longer use their token', async () => {
    expect((await asAdmin(request(app).delete('/api/users/2'))).status).toBe(204);
    expect((await asAdmin(request(app).get('/api/users/2'))).status).toBe(404);
    expect((await asMember(request(app).get('/api/loans/my'))).status).toBe(401);
  });

  test('cannot delete a user who has books on loan', async () => {
    await asMember(request(app).post('/api/loans')).send({ bookId: 1 });
    const res = await asAdmin(request(app).delete('/api/users/2'));
    expect(res.status).toBe(409);
  });

  test('can delete a user after they returned their books (loan history removed too)', async () => {
    const loan = await asMember(request(app).post('/api/loans')).send({ bookId: 1 });
    await asMember(request(app).post(`/api/loans/${loan.body.loan.id}/return`));
    expect((await asAdmin(request(app).delete('/api/users/2'))).status).toBe(204);
  });

  test('an admin cannot delete their own account', async () => {
    const res = await asAdmin(request(app).delete('/api/users/1'));
    expect(res.status).toBe(400);
  });

  test('404 for a missing user and 400 for an invalid id', async () => {
    expect((await asAdmin(request(app).delete('/api/users/999'))).status).toBe(404);
    expect((await asAdmin(request(app).delete('/api/users/0'))).status).toBe(400);
  });
});
