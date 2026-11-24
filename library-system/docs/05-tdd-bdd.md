# 5. TDD and BDD

## 5.1 Approach

| Item | Details |
|---|---|
| Language / unit test framework | JavaScript (Node.js), so **Jest 30** is used. It is the JavaScript counterpart of JUnit, NUnit and PyTest. |
| BDD framework | **Cucumber.js 13** (`@cucumber/cucumber`) with scenarios written in **Gherkin** |
| TDD feature | New business rule: **loan renewal** (`checkRenewal` in `backend/src/utils/loanRules.js`) |
| BDD features | Borrowing books (F-05) and returning books with late fines (F-06), tested end to end through the REST API |
| Tests | 15 TDD unit tests (`backend/tests/unit/loanRenewal.test.js`). 2 features, 3 scenarios (one is a 5-row Scenario Outline), giving 7 executed scenarios and 42 steps (`backend/features/`) |
| Executed on | 2026-11-24, Windows 11, Node.js 24.15 |

### How to run

```bash
cd backend
npm install
npm run test:tdd   # the TDD unit tests for loan renewal (verbose)
npm run test:unit  # all unit tests, including the TDD ones
npm run test:bdd   # Cucumber scenarios; HTML report in backend/reports/cucumber-report.html
```

---

## 5.2 TDD: Loan renewal

### The new requirement

> A member may **renew** (extend) a book they are still borrowing. The new due date is **14 days after the current due date**. A loan can be renewed **at most 2 times**. **Overdue** or **returned** loans cannot be renewed.

`checkRenewal(loan, now)` returns either `{ allowed: true, newDueAt, renewalsLeft }` or `{ allowed: false, reason }`.

### Red → Green → Refactor

The rule was built in three steps, and the test suite was run after each one.

| Step | What was done | Result |
|---|---|---|
| **1. Red** | The 15 tests in `loanRenewal.test.js` were written first, while `checkRenewal` and `MAX_RENEWALS` did not exist yet. The tests describe the rule: allowed cases, refused cases, the order of the refusal reasons, and boundary values on the renewal count. | **15 failed / 15** (`checkRenewal is not a function`, `MAX_RENEWALS` is `undefined`) |
| **2. Green** | The simplest code that passes: three `if` statements (returned, overdue, limit reached) and the due date worked out by hand (`due_at + LOAN_DAYS * DAY_MS`). | **15 passed / 15** |
| **3. Refactor** | The duplicated logic was removed. The returned and overdue checks now reuse `getLoanStatus()`, the new due date reuses `calculateDueDate()`, the refusal messages are kept in one table, and `\|\| 0` was changed to `?? 0`. The tests were not changed. | **15 passed / 15**. All 88 unit tests pass. Every line of `checkRenewal` is covered. |

### Final code (after refactoring)

```js
const MAX_RENEWALS = 2;

const RENEWAL_REFUSED = {
  returned: 'This book has already been returned',
  overdue: 'Overdue books cannot be renewed',
};

function checkRenewal(loan, now) {
  const status = getLoanStatus(loan, now);
  if (status !== 'borrowed') return { allowed: false, reason: RENEWAL_REFUSED[status] };

  const renewals = loan.renewals ?? 0;
  if (renewals >= MAX_RENEWALS) {
    return { allowed: false, reason: `A loan can be renewed at most ${MAX_RENEWALS} times` };
  }
  return { allowed: true, newDueAt: calculateDueDate(loan.due_at), renewalsLeft: MAX_RENEWALS - renewals - 1 };
}
```

### Unit test cases

| ID | Group | Input | Expected |
|---|---|---|---|
| TDD-01 | Allowed | Active loan, before the due date | `allowed: true` |
| TDD-02 | Allowed | Due 2026-03-15, renewed on 2026-03-10 | `newDueAt` = 2026-03-29 (due date + 14 days, not today + 14) |
| TDD-03 | Allowed | Renewed exactly at the due date | `allowed: true` (not overdue yet) |
| TDD-04 | Allowed | Loan without a `renewals` field | Counts as 0, so `allowed: true` and `renewalsLeft: 1` |
| TDD-05 | Allowed | `renewals` = 0 and 1 | `renewalsLeft` = 1 and 0 |
| TDD-06 | Refused | Returned loan | `"This book has already been returned"` |
| TDD-07 | Refused | 1 second after the due date | `"Overdue books cannot be renewed"` |
| TDD-08 | Refused | `renewals` = 2 | `"A loan can be renewed at most 2 times"` |
| TDD-09 | Refused | Returned **and** over the limit | The "returned" reason comes first |
| TDD-10 | Refused | Overdue **and** over the limit | The "overdue" reason comes first |
| TDD-11–14 | Boundary | `renewals` = 0 / 1 / 2 / 3 | allowed / allowed / refused / refused |
| TDD-15 | Constant | `MAX_RENEWALS` | 2 |

### Outcome

TDD made design decisions explicit before any code was written: which reason wins when several apply, the date the new due date is counted from, and how a missing `renewals` field is handled. The rule is a pure function in the business-rule layer, so it is fully unit-tested now. A `/api/loans/:id/renew` endpoint and a `renewals` database column are the next steps to expose it in the app. They are out of scope for this task.

---

## 5.3 BDD: Gherkin scenarios with Cucumber

### Structure

```
backend/
├── cucumber.js                         Cucumber settings (paths, HTML report, strict mode)
└── features/
    ├── borrowing.feature               Feature: Borrowing books
    ├── returning.feature               Feature: Returning books and late fines
    ├── step_definitions/library.steps.js   Given/When/Then steps calling the REST API
    └── support/world.js                fresh in-memory database + fake clock for each scenario
```

Each scenario runs against the real Express app and a fresh in-memory SQLite database seeded with the demo data. Requests are sent through Supertest. The **fake clock** from `tests/helpers.js` moves time forward, so fines are tested without waiting.

### Feature 1: Borrowing books (`borrowing.feature`)

```gherkin
Feature: Borrowing books
  As a library member
  I want to borrow books online
  So that I can read them at home, as long as I stay within the borrowing limit

  Background:
    Given I am logged in as the member "jane@library.com" with password "Member123"

  Scenario: Member borrows an available book
    Given the book "Clean Code" has 3 copies available
    When I borrow "Clean Code"
    Then the loan is created with status "borrowed"
    And the book is due 14 days from today
    And the book "Clean Code" has 2 copies available

  Scenario: Member cannot borrow a fourth book
    Given I have already borrowed these books:
      | title                    |
      | Clean Code               |
      | The Pragmatic Programmer |
      | Refactoring              |
    When I borrow "Domain-Driven Design"
    Then the request is refused with status 400
    And I see the error "You cannot borrow more than 3 books at a time"
    And I have 3 books on loan
```

### Feature 2: Returning books and late fines (`returning.feature`)

```gherkin
Feature: Returning books and late fines
  As a library member
  I want to know what I owe when I return a book
  So that late fines are fair: $1 for each started day late, never more than $20

  Background:
    Given I am logged in as the member "jane@library.com" with password "Member123"
    And I have borrowed "Clean Code" today

  Scenario Outline: Fine depends on how late the book is returned
    Given <days> days have passed since the due date
    When I return "Clean Code"
    Then the loan status is "returned"
    And I am charged a fine of $<fine>

    Examples:
      | days | fine |
      | 0    | 0    |
      | 1    | 1    |
      | 19   | 19   |
      | 20   | 20   |
      | 21   | 20   |
```

The Examples table reuses the boundary values from black-box testing (section 3): on time, just late, just below the cap, at the cap and just above it.

### Results

```
> cucumber-js

..........................................

7 scenarios (7 passed)
42 steps (42 passed)
```

| Scenario | Result |
|---|---|
| Member borrows an available book | Pass |
| Member cannot borrow a fourth book | Pass |
| Fine depends on how late… (0 → $0) | Pass |
| … (1 → $1) | Pass |
| … (19 → $19) | Pass |
| … (20 → $20) | Pass |
| … (21 → $20, the cap) | Pass |

### Do the scenarios detect bugs?

As a quick mutation check, the fine cap was changed from `MAX_FINE = 20` to `25` and Cucumber was run again:

```
And I am charged a fine of $20
    AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
    21 !== 20
7 scenarios (6 passed, 1 failed)
```

The "21 days late" row failed as expected. The change was then reverted.

---

## 5.4 TDD and BDD compared

| | TDD (Jest) | BDD (Cucumber + Gherkin) |
|---|---|---|
| Written by / for | Developers | Developers, testers and business stakeholders |
| Level | Unit: one pure function | Acceptance: the whole API and database |
| Language | JavaScript `expect(...)` | Plain-English Given / When / Then |
| Speed | About 15 tests in under 1 s | 7 scenarios in about 1 s (in-memory database) |
| Main value | Drives the design of the code and gives fast feedback | Gives shared, executable documentation of the business rules |
