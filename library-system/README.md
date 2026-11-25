# Library Management System

A small full-stack CRUD application built as the system under test for a QA / software testing project.

| Part     | Technology                          | Folder      |
|----------|-------------------------------------|-------------|
| Frontend | React 19 + Vite + React Router      | `frontend/` |
| Backend  | Node.js + Express 5 (REST API)      | `backend/`  |
| Database | SQL (SQLite, built into Node.js)    | `backend/src/schema.sql` |
| Tests    | Jest + Supertest + Cucumber (backend), Vitest + React Testing Library (frontend), Selenium WebDriver (UI) | `backend/tests/`, `backend/features/`, `frontend/src/__tests__/`, `e2e/` |
| CI       | GitHub Actions (runs every suite on each push) | `../.github/workflows/ci.yml` |

---

## 1. How to run

Requirements: **Node.js 22.13 or newer**. No database server is needed. SQLite saves everything to `backend/library.db`, and the file is created on first start.

Open **two terminals**:

```bash
# Terminal 1 - backend API on http://localhost:5000
cd backend
npm install
npm start
```

```bash
# Terminal 2 - frontend on http://localhost:3000
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**. The frontend sends `/api/...` calls to the backend.

### Demo accounts (created automatically)

| Role   | Email               | Password    |
|--------|---------------------|-------------|
| Admin  | admin@library.com   | Admin123    |
| Member | jane@library.com    | Member123   |

To reset all data, stop the backend and delete `backend/library.db`.

---

## 2. Features and business rules

**Users**
- Anyone can register. New accounts are always `member`.
- Name: required, max 50 characters. Email: valid and unique (case-insensitive).
- Password: at least 8 characters, with at least one letter and one number.
- Login returns a token (JWT) that is valid for 8 hours.

**Books** (anyone can view and search; only admins can add, edit, or delete)
- Search by title, author, or ISBN.
- Title: required, max 200 characters. Author: required, max 100 characters.
- ISBN: 10 or 13 digits (dashes and spaces are removed) and must be unique.
- Year: whole number from 1450 to the current year. Copies: whole number from 1 to 50.
- Copies cannot be set lower than the number currently on loan.
- A book cannot be deleted while any copy is on loan.

**User management** (admin only, full CRUD)
- Admins can list and search users (by name or email) and see how many books each user has on loan.
- Admins can create users with the role `member` or `admin` (same name, email and password rules as registration).
- Admins can edit a user's name, email, role and password. Leaving the password empty keeps the old one.
- An admin cannot remove their own admin role or delete their own account.
- A user cannot be deleted while they have books on loan. When a user is deleted, their loan history is deleted too.
- Changes apply immediately: a deleted user's token stops working, and a new role takes effect on the next request.

**Loans** (logged-in users)
- A loan lasts **14 days**.
- A member can hold at most **3 books** at a time.
- A member cannot borrow the same book twice at the same time.
- A book cannot be borrowed when no copies are available.
- Late return: **$1 fine for each started day late, capped at $20**.
- Members can return only their own books. Admins can return anyone's.
- A loan's status is `borrowed`, `overdue` (past the due date), or `returned`.

---

## 3. User flows to test

| # | Flow | Who | Steps |
|---|------|-----|-------|
| 1 | Register | Guest | Register → redirected to Login with a success message |
| 2 | Register with invalid data | Guest | Empty name, bad email, or short password → error list shown |
| 3 | Login / Logout | Any | Login → name shown in the nav bar → Logout |
| 4 | Login with a wrong password | Any | Error "Invalid email or password" |
| 5 | Browse and search books | Guest | Search "fowler" → only *Refactoring* is shown |
| 6 | Borrow a book | Member | Books → Borrow → success message, available count drops by 1 |
| 7 | Borrow limit | Member | Borrow 3 books → the 4th fails with "more than 3 books" |
| 8 | Book unavailable | Member | Borrow button is disabled when available = 0 |
| 9 | Return a book | Member | My Loans → Return → status "returned", copy available again |
| 10 | Add a book | Admin | Add Book → fill the form → book appears in the list |
| 11 | Add a book with invalid data | Admin | Blank title, 5-digit ISBN, or year 3000 → errors shown |
| 12 | Edit a book | Admin | Edit → change copies → saved |
| 13 | Delete a book | Admin | Delete → confirm → removed (blocked if the book is on loan) |
| 14 | View all loans | Admin | All Loans shows every member's loans; admin can return them |
| 15 | Access control | Member/Guest | `/books/new`, `/admin/loans` and `/admin/users` are blocked; guests are sent to Login |
| 16 | Add a user | Admin | Users → Add User → fill the form, choose a role → the user appears and can log in |
| 17 | Edit a user | Admin | Users → Edit → change the name or role → saved (empty password keeps the old one) |
| 18 | Delete a user | Admin | Users → Delete → confirm → removed (blocked if the user has books on loan; no Delete button on your own row) |
| 19 | Search users | Admin | Search "jane" → only Jane Member is shown |

**CRUD summary:** Books and Users have full Create / Read / Update / Delete. Loans have Create (borrow), Read and Update (return).

Good boundary values to test: password length 7/8, name length 50/51, year 1449/1450 and current year/+1, copies 0/1/50/51, the 3rd/4th loan, fine at 19/20/21 days late.

---

## 4. REST API

| Method | URL | Access | Description |
|--------|-----|--------|-------------|
| GET    | `/api/health` | public | Health check |
| POST   | `/api/auth/register` | public | `{ name, email, password }` |
| POST   | `/api/auth/login` | public | `{ email, password }` → `{ token, user }` |
| GET    | `/api/auth/me` | logged in | Current user |
| GET    | `/api/books?search=` | public | List or search books |
| GET    | `/api/books/:id` | public | One book |
| POST   | `/api/books` | admin | `{ title, author, isbn, year, copies }` |
| PUT    | `/api/books/:id` | admin | Same body as POST |
| DELETE | `/api/books/:id` | admin | Delete a book |
| POST   | `/api/loans` | logged in | `{ bookId }`: borrow |
| POST   | `/api/loans/:id/return` | owner/admin | Return a book |
| GET    | `/api/loans/my` | logged in | My loans |
| GET    | `/api/loans` | admin | All loans |
| GET    | `/api/users?search=` | admin | List or search users |
| GET    | `/api/users/:id` | admin | One user |
| POST   | `/api/users` | admin | `{ name, email, password, role }` |
| PUT    | `/api/users/:id` | admin | `{ name, email, role, password? }` |
| DELETE | `/api/users/:id` | admin | Delete a user |

Send the token as the header `Authorization: Bearer <token>`.
Errors look like `{ "error": "message", "details": ["..."] }`, with status codes 400, 401, 403, 404, or 409.

---

## 5. Automated tests and coverage

```bash
cd backend
npm test                 # all backend tests
npm run test:unit        # only unit tests (validation, loan rules, passwords)
npm run test:integration # only API tests (real in-memory SQL database)
npm run test:blackbox    # black-box tests (EP, BVA, decision tables - see docs/03-black-box-testing.md)
npm run test:whitebox    # white-box tests with coverage (see docs/04-white-box-testing.md)
npm run test:tdd         # TDD unit tests for loan renewal (see docs/05-tdd-bdd.md)
npm run test:bdd         # BDD scenarios in Gherkin, run with Cucumber (see docs/05-tdd-bdd.md)
npm run test:coverage    # creates backend/coverage/ (lcov + HTML report)

cd ../frontend
npm test                 # React component tests
npm run test:coverage    # creates frontend/coverage/ (lcov + HTML report)
```

Open `coverage/index.html` in either folder to see the coverage report in a browser.

### UI tests with Selenium

Start the backend (`DB_FILE=:memory: npm start` for a fresh database) and the frontend (`npm run dev`), then:

```bash
cd e2e
npm install
npm test                 # 8 Selenium WebDriver tests in headless Chrome (see docs/06-test-automation-and-ci.md)
```

### Performance and security tests

```powershell
# load test: start the backend first, needs Apache JMeter 5.6.3
powershell -ExecutionPolicy Bypass -File performance/run-load-tests.ps1 -JMeter C:/apache-jmeter-5.6.3/bin/jmeter.bat

# OWASP Top 10 checks: starts its own API with a temporary database
node security/owasp-checks.js
```

Results, security findings and the usability review are in `docs/07-performance-security-usability.md`.

### Continuous integration

GitHub Actions (`.github/workflows/ci.yml` in the repository root) runs on every push and pull request:
backend Jest + Cucumber, frontend Vitest + build, then the Selenium UI tests against the running app.

The backend tests use a **fake clock** (`tests/helpers.js`), so overdue loans and fines are tested without waiting 14 days.

---

## 6. SonarQube

1. Start a SonarQube server, for example with Docker: `docker run -d -p 9000:9000 sonarqube:community`, then open http://localhost:9000 (default login admin/admin) and create a token.
2. Use the SonarScanner npm package (`@sonar/scan`) or download the standalone scanner.
3. Create the coverage reports (`npm run test:coverage` in **both** `backend/` and `frontend/`).
4. From this folder (`library-system/`), set `SONAR_TOKEN` and run:

```powershell
$env:SONAR_TOKEN = '<your SonarQube token>'
npm exec --yes --package=@sonar/scan -- sonar-scanner-npm -Dsonar.host.url=http://localhost:9000 -Dsonar.token=$env:SONAR_TOKEN
```

The settings are in `sonar-project.properties`.

The project's defect register and the SonarQube execution/metrics report are in [`docs/05-defect-tracking.md`](docs/05-defect-tracking.md) and [`docs/06-sonarqube-and-quality-metrics.md`](docs/06-sonarqube-and-quality-metrics.md).

---

## 7. Project structure

```
library-system/
├── backend/
│   ├── src/
│   │   ├── server.js          starts the API
│   │   ├── app.js             Express app and routes
│   │   ├── db.js              database connection + demo data
│   │   ├── schema.sql         SQL tables (users, books, loans)
│   │   ├── middleware/auth.js login token checks
│   │   ├── routes/            auth.js, books.js, loans.js, users.js
│   │   └── utils/             validation.js, loanRules.js, password.js
│   ├── features/          BDD: Gherkin .feature files + Cucumber step definitions
│   └── tests/
│       ├── unit/              tests for the plain functions (incl. TDD loan renewal)
│       ├── integration/       API tests with Supertest
│       ├── blackbox/          equivalence partitioning, boundary value and decision table tests
│       └── whitebox/          basis path, statement and branch coverage tests
├── e2e/                       Selenium WebDriver UI tests (tests/, support/driver.js)
├── frontend/
│   └── src/
│       ├── api.js             all calls to the backend
│       ├── AuthContext.jsx    logged-in user
│       ├── App.jsx            pages and URLs
│       ├── components/        NavBar, LoansTable, Message, ProtectedRoute
│       ├── pages/             Books, BookForm, Login, Register, MyLoans, AllLoans, Users, UserForm
│       └── __tests__/         component tests
├── performance/               JMeter load test plan, run script and results (summary.csv)
├── security/                  OWASP Top 10 checks and their output
└── sonar-project.properties
```
