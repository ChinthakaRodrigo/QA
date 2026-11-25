// Sends the OWASP Top 10 checks of docs/07-performance-security-usability.md to the API
// and prints what the API answered. Run from the library-system folder:
//   node security/owasp-checks.js
// The script starts its own API with a temporary database, so no real data is touched.
// PASS = the API is protected. FAIL = weakness found (see the findings in the report).
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const PORT = 5055;
const API = `http://localhost:${PORT}/api`;
const BACKEND = path.join(__dirname, '..', 'backend');
const ADMIN = { email: 'admin@library.com', password: 'Admin123' };
const JANE = { email: 'jane@library.com', password: 'Member123' };
const DEFAULT_SECRET = 'library-dev-secret'; // readable by anyone who can see the public repository

let serverLog = '';

async function startApi(dbFile, extraEnv = {}) {
  const env = { ...process.env, PORT, DB_FILE: dbFile, ...extraEnv };
  if (!extraEnv.JWT_SECRET) delete env.JWT_SECRET; // same as "npm start" in the README
  const server = spawn(process.execPath, ['src/server.js'], { cwd: BACKEND, env });
  server.stdout.on('data', (data) => { serverLog += data; });
  server.stderr.on('data', (data) => { serverLog += data; });
  for (let i = 0; i < 50; i += 1) {
    await new Promise((resolve) => { setTimeout(resolve, 100); });
    if (server.exitCode !== null) throw new Error(`API did not start:\n${serverLog}`);
    try {
      await fetch(`${API}/health`);
      return server;
    } catch { /* not ready yet */ }
  }
  throw new Error('API did not start');
}

async function stopApi(server) {
  const closed = new Promise((resolve) => { server.on('close', resolve); });
  server.kill();
  await closed;
}

async function call(method, url, { token, body, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined || raw !== undefined) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + url, { method, headers, body: raw ?? (body && JSON.stringify(body)) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, headers: res.headers, text, json };
}

async function login(user) {
  return (await call('POST', '/auth/login', { body: user })).json.token;
}

const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');

function makeToken(payload, { alg = 'HS256', secret = DEFAULT_SECRET } = {}) {
  const content = `${encode({ alg, typ: 'JWT' })}.${encode(payload)}`;
  const signature = alg === 'none' ? '' : crypto.createHmac('sha256', secret).update(content).digest('base64url');
  return `${content}.${signature}`;
}

const results = [];
function report(id, risk, check, expected, actual, passed) {
  results.push({ id, passed });
  console.log(`${id}  ${passed ? 'PASS' : 'FAIL'}  [${risk}] ${check}\n        expected: ${expected}\n        actual:   ${actual}`);
}

const ADMIN_ROUTES = [
  ['POST', '/books'], ['PUT', '/books/1'], ['DELETE', '/books/1'], ['GET', '/loans'],
  ['GET', '/users'], ['GET', '/users/1'], ['POST', '/users'], ['PUT', '/users/1'], ['DELETE', '/users/2'],
];
const LOGIN_ROUTES = [['GET', '/auth/me'], ['GET', '/loans/my'], ['POST', '/loans'], ['POST', '/loans/1/return']];

async function statusesOf(routes, token) {
  const statuses = [];
  for (const [method, url] of routes) statuses.push((await call(method, url, { token })).status);
  return statuses;
}

async function accessControl() {
  const guest = await statusesOf([...ADMIN_ROUTES, ...LOGIN_ROUTES]);
  report('SEC-01', 'A01', 'Guest calls all 13 protected routes', '401 for every route', guest.join(' '), guest.every((s) => s === 401));

  const jane = await login(JANE);
  const member = await statusesOf(ADMIN_ROUTES, jane);
  report('SEC-02', 'A01', 'Member calls all 9 admin routes', '403 for every route', member.join(' '), member.every((s) => s === 403));

  const sam = { name: 'Sam', email: 'sam@test.com', password: 'Reader123' };
  const registered = await call('POST', '/auth/register', { body: { ...sam, role: 'admin' } });
  report('SEC-03', 'A01', 'Register with an extra "role": "admin" field', 'role = member', `${registered.status}, role = ${registered.json.user.role}`, registered.json.user.role === 'member');

  const samToken = await login(sam);
  const loan = (await call('POST', '/loans', { token: jane, body: { bookId: 1 } })).json.loan;
  const stolen = await call('POST', `/loans/${loan.id}/return`, { token: samToken });
  const still = (await call('GET', '/loans/my', { token: jane })).json.loans[0].status;
  report('SEC-04', 'A01', "Sam returns Jane's loan by changing the id in the URL (IDOR)", '403, loan stays open', `${stolen.status}, loan is "${still}"`, stolen.status === 403 && still === 'borrowed');

  const admin = await login(ADMIN);
  await call('DELETE', `/users/${registered.json.user.id}`, { token: admin });
  const deleted = await call('GET', '/auth/me', { token: samToken });
  report('SEC-05', 'A01', 'Use the token of a deleted user', '401', String(deleted.status), deleted.status === 401);
}

async function cryptography(dbFile) {
  const db = new DatabaseSync(dbFile, { readOnly: true });
  const hash = db.prepare('SELECT password_hash FROM users WHERE id = 2').get().password_hash;
  db.close();
  report('SEC-06', 'A02', 'Read a password from the database', 'salted hash, no plain text', `${hash.slice(0, 8)}... (salt) : ${hash.slice(33, 41)}... (${(hash.length - 33) / 2}-byte scrypt hash)`, /^[0-9a-f]{32}:[0-9a-f]{128}$/.test(hash));

  const admin = await login(ADMIN);
  const bodies = (await call('GET', '/users', { token: admin })).text + (await call('POST', '/auth/login', { body: JANE })).text;
  report('SEC-07', 'A02', 'Look for password hashes in API responses', 'none', bodies.includes('password') ? 'found' : 'none', !bodies.includes('password'));

  const unsigned = await call('GET', '/users', { token: makeToken({ id: 1, role: 'admin' }, { alg: 'none' }) });
  report('SEC-08', 'A02', 'Unsigned token ("alg": "none") for the admin', '401', String(unsigned.status), unsigned.status === 401);

  const [head, , signature] = (await login(JANE)).split('.');
  const tampered = await call('GET', '/users', { token: `${head}.${encode({ id: 1, role: 'admin' })}.${signature}` });
  report('SEC-09', 'A02', "Jane's token with the id changed to 1 (admin)", '401', String(tampered.status), tampered.status === 401);

  const forged = await call('GET', '/users', { token: makeToken({ id: 1 }) });
  report('SEC-10', 'A02', 'Forge an admin token with the default secret from the source code, without any password', '401', `${forged.status}${forged.status === 200 ? `, ${forged.json.users.length} users listed as admin` : ''}`, forged.status === 401);
}

async function injection() {
  const attacks = ["' OR '1'='1", "' UNION SELECT id,email,password_hash,role,1,1,1 FROM users --", "'; DROP TABLE users; --"];
  const found = [];
  for (const attack of attacks) {
    const res = await call('GET', `/books?search=${encodeURIComponent(attack)}`);
    found.push(`${res.status}/${res.json.books.length} books`);
  }
  report('SEC-11', 'A03', 'SQL injection in the book search (OR, UNION, DROP TABLE)', '200 with 0 books, 3 times', found.join(', '), found.every((f) => f === '200/0 books'));

  const bypass = await call('POST', '/auth/login', { body: { email: "admin@library.com' --", password: 'x' } });
  const bypass2 = await call('POST', '/auth/login', { body: { email: "' OR 1=1 --", password: 'x' } });
  report('SEC-12', 'A03', 'SQL injection in the login email', '401, 401', `${bypass.status}, ${bypass2.status}`, bypass.status === 401 && bypass2.status === 401);

  const id = await call('GET', `/books/${encodeURIComponent('1 OR 1=1')}`);
  report('SEC-13', 'A03', 'SQL injection in a URL id', '400', String(id.status), id.status === 400);
}

async function configuration() {
  const health = await call('GET', '/health');
  const poweredBy = health.headers.get('x-powered-by');
  report('SEC-14', 'A05', 'Does the server reveal its technology?', 'no X-Powered-By header', poweredBy ? `X-Powered-By: ${poweredBy}` : 'no header', !poweredBy);

  const wanted = ['x-content-type-options', 'content-security-policy', 'strict-transport-security'];
  const missing = wanted.filter((name) => !health.headers.get(name));
  report('SEC-15', 'A05', 'Security headers', wanted.join(', '), missing.length ? `missing: ${missing.join(', ')}` : 'all present', missing.length === 0);

  const badJson = await call('POST', '/auth/login', { raw: '{bad' });
  const badUrl = await call('GET', '/books/%E0%A4%A');
  const leaked = /at .*\.js|node_modules|SQLITE/i.test(badJson.text + badUrl.text);
  report('SEC-16', 'A05', 'Error responses do not show stack traces or file paths', 'generic message only', `${badJson.text} ${badUrl.text}`, !leaked);

  const demo = await call('POST', '/auth/login', { body: ADMIN });
  report('SEC-17', 'A05', 'Log in with the admin password printed in the public README', '401 or forced password change', String(demo.status), demo.status !== 200);
}

const median = (values) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function timeLogin(email) {
  const times = [];
  for (let i = 0; i < 30; i += 1) {
    const start = performance.now();
    await call('POST', '/auth/login', { body: { email, password: 'WrongPass1' } });
    times.push(performance.now() - start);
  }
  return median(times);
}

async function authentication() {
  const logBefore = serverLog.length;
  const statuses = new Set();
  const start = performance.now();
  for (let i = 0; i < 100; i += 1) {
    statuses.add((await call('POST', '/auth/login', { body: { ...JANE, password: `Wrong${i}pass` } })).status);
  }
  const seconds = ((performance.now() - start) / 1000).toFixed(1);
  const correct = await call('POST', '/auth/login', { body: JANE });
  report('SEC-18', 'A07', 'Brute force: 100 wrong passwords for one account, then the right one', '429 or account lock', `100 x ${[...statuses].join('/')} in ${seconds} s, then ${correct.status}`, statuses.has(429) || correct.status !== 200);

  const logged = serverLog.slice(logBefore).trim();
  report('SEC-19', 'A09', 'Are those 100 failed logins in the server log?', 'at least one log entry', logged || 'log is empty', logged.length > 0);

  const unknown = await call('POST', '/auth/login', { body: { email: 'nobody@test.com', password: 'WrongPass1' } });
  const wrong = await call('POST', '/auth/login', { body: { ...JANE, password: 'WrongPass1' } });
  report('SEC-20', 'A07', 'Login error for an unknown email and for a wrong password', 'identical', `${unknown.status} ${unknown.text} / ${wrong.status} ${wrong.text}`, unknown.text === wrong.text && unknown.status === wrong.status);

  const knownMs = await timeLogin(JANE.email);
  const unknownMs = await timeLogin('nobody@test.com');
  report('SEC-21', 'A07', 'Response time for a registered and an unknown email (median of 30)', 'about the same', `${knownMs.toFixed(1)} ms / ${unknownMs.toFixed(1)} ms`, knownMs < unknownMs * 2);

  const weak = await call('POST', '/auth/register', { body: { name: 'Weak', email: 'weak@test.com', password: 'password1' } });
  report('SEC-22', 'A07', 'Register with the very common password "password1"', '400', String(weak.status), weak.status === 400);

  const admin = await login(ADMIN);
  const oldToken = await login(JANE);
  const changed = await call('PUT', '/users/2', { token: admin, body: { name: 'Jane Member', email: JANE.email, role: 'member', password: 'NewPass123' } });
  const after = await call('GET', '/auth/me', { token: oldToken });
  report('SEC-23', 'A07', "Admin resets Jane's password, then her old token is used", '401', `reset ${changed.status}, old token ${after.status}`, after.status === 401);
}

async function main() {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'owasp-'));
  const dbFile = path.join(folder, 'test.db');
  let server;
  try {
    server = await startApi(dbFile);
    await accessControl();
    await cryptography(dbFile);
    await injection();
    await configuration();
    await authentication();
    await stopApi(server);

    // Shows that the problem of SEC-10 disappears when a secret is configured.
    server = await startApi(path.join(folder, 'test2.db'), { JWT_SECRET: crypto.randomBytes(32).toString('hex') });
    const forged = await call('GET', '/users', { token: makeToken({ id: 1 }) });
    report('SEC-10b', 'A02', 'SEC-10 again, with JWT_SECRET set to a random value', '401', String(forged.status), forged.status === 401);
  } finally {
    if (server && server.exitCode === null && !server.killed) await stopApi(server);
    fs.rmSync(folder, { recursive: true, force: true });
  }

  const failed = results.filter((r) => !r.passed).map((r) => r.id);
  console.log(`\n${results.length} checks, ${results.length - failed.length} passed, ${failed.length} failed: ${failed.join(', ')}`);
}

main();
