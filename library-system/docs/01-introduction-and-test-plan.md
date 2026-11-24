# 1. Introduction & Test Planning

## 1.1 Introduction

### Purpose
This document plans the quality assurance and testing activities for the **Library Management System (LMS)**. The LMS is a small full-stack web application built from scratch for this project. The plan sets out what will be tested, how, with which tools and resources, and against which quality characteristics.

### System under test (SUT)
The LMS lets library members browse, search and borrow books. Administrators use it to manage the book catalogue and user accounts and to see all loans. Two entities, **Books** and **Users**, support the full set of CRUD operations (Create, Read, Update, Delete).

| Layer | Technology | Location |
|---|---|---|
| Presentation | React 19 single-page application (Vite, React Router) | `frontend/` |
| Application | Node.js + Express 5 REST API, JWT authentication | `backend/src/` |
| Data | SQL relational database (SQLite), 3 tables: `users`, `books`, `loans` | `backend/src/schema.sql` |

The source code is fully available, which allows white-box testing, code coverage measurement and static analysis with SonarQube.

### Users / roles
- **Guest**: not logged in. Can browse and search books, register and log in.
- **Member**: can borrow and return books and view their own loans.
- **Admin**: everything a member can do, plus create, update and delete books and users, and view and return all loans.

---

## 1.2 Test Scope

### Features in scope

| ID | Feature / module | Main business rules to verify |
|---|---|---|
| F-01 | **User registration** | Name required (≤ 50 chars); valid, unique email (case-insensitive); password ≥ 8 chars with a letter and a digit; new accounts are always `member` |
| F-02 | **Login / logout / session** | Correct credentials return a JWT (valid 8 h); wrong email and wrong password give the same message; invalid or expired token → 401 |
| F-03 | **Book catalogue: Read** | List books sorted by title; search by title, author or ISBN; show available / total copies |
| F-04 | **Book management: Create, Update, Delete** (admin) | Field validation (title ≤ 200, author ≤ 100, ISBN 10/13 digits and unique, year 1450 to current year, copies 1–50); copies cannot go below the number on loan; a book on loan cannot be deleted |
| F-05 | **Borrow a book** | Max 3 active loans per member; no duplicate active loan of the same book; no borrowing when 0 copies are available; due date = borrow date + 14 days |
| F-06 | **Return a book & fines** | Owner or admin only; cannot return twice; fine $1 per started day late, capped at $20 |
| F-07 | **Loan views** | Member sees only their own loans; admin sees all loans; status `borrowed` / `overdue` / `returned` |
| F-08 | **Access control** | Guest, member and admin permissions on every API endpoint and protected page; a deleted user's token is rejected and role changes apply immediately |
| F-09 | **Error handling** | Correct HTTP status codes (400/401/403/404/409), clear messages, invalid JSON handled |
| F-10 | **User management: Create, Read, Update, Delete** (admin) | List/search users with books on loan; create users with role `member`/`admin` (same field rules as F-01); edit name, email, role and password (empty password keeps the old one); email stays unique; an admin cannot remove their own admin role or delete themselves; a user with books on loan cannot be deleted |

### Out of scope

| Item | Reason |
|---|---|
| Load / stress testing at scale | Small academic system; only basic response-time checks are planned |
| Cross-browser testing beyond Chrome and Edge | Limited time and resources |
| Mobile devices / native apps | Not part of the system |
| Third-party code (React, Express, SQLite, npm packages) | Assumed to be tested by their maintainers; only our use of them is tested |
| Formal penetration testing | Out of the course scope; basic security checks only (see 1.4) |
| Self-service profile editing by members, "forgot password" reset, email notifications | Not implemented in the current version (admins edit users through F-10) |
| Deployment, backups, production infrastructure | The system runs locally only |

---

## 1.3 Test Plan

### Objectives
1. Verify that every in-scope feature (F-01 to F-10), including all four CRUD operations on Books and Users, works according to the business rules above.
2. Validate that the main user flows (register → login → borrow → return; admin manages books and users) can be completed through the UI.
3. Find and report defects, then retest fixes and run regression tests.
4. Achieve **≥ 80 % line and branch coverage** on backend and frontend source code.
5. Pass the **SonarQube Quality Gate** (no Blocker/Critical issues, A rating for reliability and security, duplication < 3 %).
6. Assess the system against the selected ISO/IEC 25010 quality characteristics (section 1.4).

### Test levels and approach

| Level | What is tested | Type | Tools |
|---|---|---|---|
| Static testing | Requirements/README review, code review, static analysis (bugs, code smells, vulnerabilities, duplication) | Static, white-box | SonarQube, manual review |
| Unit testing | Pure functions: validation, loan rules (due date, fines, status), password hashing | Dynamic, white-box | Jest |
| Integration / API testing | REST endpoints with a real in-memory SQL database; fake clock for overdue/fine scenarios | Dynamic, grey-box | Jest + Supertest, Postman |
| Component testing (UI) | React pages and components with a mocked API | Dynamic, white-box | Vitest + React Testing Library |
| System / end-to-end testing | Complete user flows in the browser against the running system | Dynamic, black-box | Manual test cases (optional: Selenium / Playwright) |
| Non-functional testing | Basic security checks, response time, usability review | Dynamic | Browser DevTools, Postman, checklist |
| Regression testing | Re-run the automated suites after every fix | Dynamic | `npm test` in both folders |

### Test design techniques
- **Equivalence partitioning**: e.g. valid/invalid emails, ISBN formats, user roles (`member`, `admin`, invalid values).
- **Boundary value analysis**: password length 7/8, name 50/51, year 1449/1450 and current year/+1, copies 0/1/50/51, 3rd/4th active loan, fine at 19/20/21 days late.
- **Decision tables**: borrowing a book (book exists? already borrowed? fewer than 3 loans? copies available?) and deleting a user (user exists? is it yourself? has books on loan?).
- **State transition**: loan lifecycle `borrowed → overdue → returned` and `borrowed → returned`.
- **Use-case / scenario testing**: the 19 user flows listed in the README.
- **Statement and branch coverage** (white-box): measured with Jest and Vitest coverage reports.
- **Exploratory testing**: time-boxed sessions on the UI.

### Entry and exit criteria

| Entry criteria | Exit criteria |
|---|---|
| System builds and starts (backend and frontend) | All planned test cases executed |
| Requirements and business rules documented (README) | 100 % of high-priority test cases passed |
| Test environment and demo data ready | No open Critical or High defects |
| Test cases reviewed | Coverage ≥ 80 % (lines and branches) |
| | SonarQube Quality Gate passed |
| | Test summary report written |

### Resources

**People**

| Role | Name | Responsibilities |
|---|---|---|
| Test lead | *[name]* | Test plan, schedule, final report |
| Test analyst / designer | *[name]* | Test case design, traceability matrix |
| Test engineer (automation) | *[name]* | Unit, API and UI automated tests, coverage |
| Test engineer (manual) | *[name]* | System test execution, defect reporting, exploratory testing |

**Environment and tools**

| Item | Details |
|---|---|
| Hardware / OS | Windows 11 PC |
| Runtime | Node.js 24 |
| Browsers | Google Chrome, Microsoft Edge (latest) |
| Database | SQLite (file `backend/library.db`; in-memory for automated tests) |
| Test tools | Jest 30, Supertest 7, Vitest 5, React Testing Library, Postman |
| Static analysis | SonarQube Community Edition (Docker) + SonarScanner |
| Defect tracking | *[e.g. GitHub Issues / Jira / Excel defect log]* |
| Test data | Seeded demo accounts (admin, member) and 5 sample books |

### Schedule

| Week | Activities | Deliverable |
|---|---|---|
| 1 | Build the system, review requirements, write the test plan | Test plan (this document) |
| 2 | Design test cases, build the traceability matrix | Test case specification |
| 3 | Unit, integration and component test automation; coverage analysis | Automated test suites, coverage reports |
| 4 | System testing (manual), non-functional checks, SonarQube scan | Test execution log, defect reports, SonarQube report |
| 5 | Defect fixing, retesting, regression; final report | Test summary report |

*Adjust the weeks to match the submission deadline.*

### Deliverables
Test plan, test cases with a traceability matrix, automated test suites, coverage reports, SonarQube report, defect log, and a test summary report.

### Risks and mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Time-dependent rules (14-day loans, fines) are hard to test manually | Overdue logic not tested | Injected fake clock in automated tests; manual check by editing dates in the database |
| Limited time / small team | Incomplete testing | Prioritise high-risk features (F-05, F-06, F-08, F-10) first |
| Admin locks themselves out or deletes active users | Loss of admin access or loan data | Business rules prevent self-demotion, self-deletion and deleting users with books on loan; test these explicitly |
| Tests share data and become flaky | Unreliable results | Each automated test uses a fresh in-memory database |
| Known security weaknesses (default JWT secret, token in `localStorage`, no login rate limiting) | Security defects | Check these explicitly and report them as findings |
| SonarQube setup problems | No static analysis results | Run SonarQube with Docker early (week 1–2) |

---

## 1.4 Quality Model: ISO/IEC 25010

The product quality model of **ISO/IEC 25010** is used. The table uses the 2011 names; in the 2023 revision, *Usability* is called *Interaction capability* and *Portability* is called *Flexibility*. Six of the eight characteristics are targeted.

| Characteristic | Sub-characteristics targeted | How it will be evaluated | Target |
|---|---|---|---|
| **Functional suitability** *(main focus)* | Completeness, correctness, appropriateness | Functional test cases for F-01 to F-10 (incl. CRUD on Books and Users); business-rule checks (loan limit, fines, validation) | 100 % of high-priority test cases pass |
| **Security** | Confidentiality, integrity, authenticity, accountability | Role/permission tests on every endpoint; password hashing check; token tampering; SQL injection attempts in search and login; SonarQube security hotspots | No unauthorised access; no Critical vulnerabilities |
| **Reliability** | Maturity, fault tolerance | Invalid input, malformed JSON, missing records, repeated actions (double return) must not crash the server; defect density | No unhandled server errors (HTTP 500) during testing |
| **Maintainability** | Modularity, analysability, testability, modifiability | SonarQube (code smells, complexity, duplication, maintainability rating); code coverage | Rating A, duplication < 3 %, coverage ≥ 80 % |
| **Usability** | Learnability, operability, user error protection, accessibility | Heuristic review of the UI; clear error messages; disabled Borrow button when unavailable; delete confirmation; labelled form fields | All main flows done without help; every error shows a clear message |
| **Performance efficiency** | Time behaviour | Measure API response times with Postman / DevTools | Typical requests < 500 ms locally |
| Compatibility | — | Out of scope (only checked in Chrome and Edge) | — |
| Portability | — | Out of scope | — |

---

## 1.5 Verification vs. Validation

- **Verification**: *"Are we building the product right?"* Checks that the work matches its specification (business rules, API contract, coding standards). It is often static.
- **Validation**: *"Are we building the right product?"* Checks that the running system meets the users' real needs. It is dynamic and done from the user's point of view.

| Activity | Type | Static / Dynamic | Description in this project |
|---|---|---|---|
| Requirements / business-rule review | Verification | Static | Check that the README rules are complete, consistent and testable |
| Code review | Verification | Static | Peer review of routes (auth, books, loans, users), validation and React pages |
| SonarQube static analysis | Verification | Static | Bugs, vulnerabilities, code smells, duplication, complexity |
| Test plan and test case review | Verification | Static | Check test cases against the requirements (traceability matrix) |
| Unit testing | Verification | Dynamic | Each function matches its specification (e.g. fine = $1/day, max $20) |
| API integration testing | Verification | Dynamic | Endpoints return the specified status codes and data |
| Component testing | Verification | Dynamic | React pages render and behave as designed |
| Code coverage analysis | Verification | Dynamic | Confirms how much of the code the tests exercise |
| System / end-to-end testing of user flows | Validation | Dynamic | A member can actually register, borrow and return a book through the UI |
| Usability review / exploratory testing | Validation | Dynamic | The system is easy to understand and use for a librarian and members |
| User acceptance testing (UAT) with sample users | Validation | Dynamic | Classmates act as members/admins and confirm the system meets their needs |
