# 3. Black-Box Testing

## 3.1 Approach

The Library Management System is tested here **without using its source code**. Inputs are sent to the public REST API, and the outputs (HTTP status, response body, resulting data) are compared with the business rules in the [README](../README.md). Feature IDs (F-01 to F-10) refer to the [test plan](01-introduction-and-test-plan.md).

| Technique | Applied to | Test file (`backend/tests/blackbox/`) | Tests |
|---|---|---|---|
| Equivalence Partitioning (EP) | Email, password, ISBN, search keyword, `bookId`, request format | `equivalencePartitioning.test.js` | 56 |
| Boundary Value Analysis (BVA) | Year, copies, loan limit, dates, fine, field lengths, session time | `boundaryValueAnalysis.test.js` | 61 |
| Decision tables (DT) | Login, borrow a book, delete a user | `decisionTables.test.js` | 23 |
| **Total** | | | **140** |

### Environment and preconditions

| Item | Details |
|---|---|
| OS / runtime | Windows 11, Node.js 24.11 |
| Tools | Jest 30, Supertest 7 |
| Test data | New in-memory database for every test, with the demo data: 1 admin, 1 member (Jane), 5 books, no loans |
| Clock | Fixed at **2026-03-01 10:00 UTC**, so "current year" is 2026. Tests move it to check dates |
| Executed on | 2026-11-24 |

### How to run

```bash
cd backend
npm install
npm run test:blackbox
```

Tests for open defects check the *correct* behaviour and are marked as "expected to fail" (`knownDefect`), so the normal run stays green. To see them fail:

```powershell
$env:SHOW_DEFECTS = '1'; npm run test:blackbox; Remove-Item Env:SHOW_DEFECTS
```

When a defect is fixed, the normal run reports its test. Change `knownDefect` back to `test` to close it.

---

## 3.2 Equivalence Partitioning

The inputs of a field are divided into classes that the system should treat in the same way, and one value is tested per class. Each invalid class is tested alone, with all other fields valid, so that one error cannot hide another.

### EP-A Registration: email (F-01)
Rule: *valid and unique (case-insensitive)*.

| ID | Class | Type | Test value | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| EP-01 | Simple address | Valid | `sam@test.com` | 201 | 201 | Pass |
| EP-02 | Upper case and surrounding spaces | Valid | `"  SAM@Test.COM "` | 201, stored as `sam@test.com` | As expected | Pass |
| EP-03 | Plus tag and sub-domain | Valid | `sam+lib@mail.test.com` | 201 | 201 | Pass |
| EP-04 | Missing | Invalid | *(none)* | 400, email error | As expected | Pass |
| EP-05 | Only spaces | Invalid | `"   "` | 400, email error | As expected | Pass |
| EP-06 | No `@` | Invalid | `samtest.com` | 400, email error | As expected | Pass |
| EP-07 | No local part | Invalid | `@test.com` | 400, email error | As expected | Pass |
| EP-08 | No top-level domain | Invalid | `sam@test` | 400, email error | As expected | Pass |
| EP-09 | Two `@` signs | Invalid | `sam@x@test.com` | 400, email error | As expected | Pass |
| EP-10 | Space inside | Invalid | `sam reader@test.com` | 400, email error | As expected | Pass |
| EP-11 | Not text | Invalid | `12345` (number) | 400, email error | As expected | Pass |
| EP-12 | Already registered | Invalid | `JANE@library.com` | 409 | 409 | Pass |
| EP-13 | Consecutive dots in domain | Invalid | `sam@test..com` | 400 | **201** | **Fail (BB-03)** |
| EP-14 | Domain starts with a dot | Invalid | `sam@.test.com` | 400 | **201** | **Fail (BB-03)** |

### EP-B Registration: password (F-01)
Rule: *at least 8 characters, with at least one letter and one number*.

| ID | Class | Type | Test value | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| EP-15 | Letters and digits | Valid | `Reader123` | 201, can log in | As expected | Pass |
| EP-16 | Letters, digits and symbols | Valid | `Read#er-123!` | 201, can log in | As expected | Pass |
| EP-17 | Missing | Invalid | *(none)* | 400, length error | As expected | Pass |
| EP-18 | Too short | Invalid | `Ab1` | 400, length error | As expected | Pass |
| EP-19 | Letters only | Invalid | `ReaderPass` | 400, letter + number error | As expected | Pass |
| EP-20 | Digits only | Invalid | `1234567890` | 400, letter + number error | As expected | Pass |
| EP-21 | Symbols only | Invalid | `!@#$%^&*()` | 400, letter + number error | As expected | Pass |
| EP-22 | Not text | Invalid | `1234567890` (number) | 400, length error | As expected | Pass |

### EP-C Add book: ISBN (F-04)
Rule: *10 or 13 digits (dashes and spaces are removed) and unique*.

| ID | Class | Type | Test value | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| EP-23 | 10 digits | Valid | `0306406152` | 201 | 201 | Pass |
| EP-24 | 13 digits | Valid | `9780306406157` | 201 | 201 | Pass |
| EP-25 | 13 digits with dashes | Valid | `978-0-306-40615-7` | 201, dashes removed | As expected | Pass |
| EP-26 | 10 digits with spaces | Valid | `0 306 40615 2` | 201, spaces removed | As expected | Pass |
| EP-27 | Empty | Invalid | `""` | 400, ISBN error | As expected | Pass |
| EP-28 | Fewer than 10 digits | Invalid | `12345` | 400, ISBN error | As expected | Pass |
| EP-29 | 11 or 12 digits | Invalid | `12345678901` | 400, ISBN error | As expected | Pass |
| EP-30 | More than 13 digits | Invalid | `978030640615712` | 400, ISBN error | As expected | Pass |
| EP-31 | Contains letters | Invalid | `97803064O615A` | 400, ISBN error | As expected | Pass |
| EP-32 | Unsupported separator | Invalid | `978.0306406157` | 400, ISBN error | As expected | Pass |
| EP-33 | Already in the catalogue | Invalid | `978-0-13-235088-4` | 409 | 409 | Pass |

### EP-D Book search: keyword (F-03)
Rule: *search by title, author, or ISBN*.

| ID | Class | Test value | Expected | Actual | Status |
|---|---|---|---|---|---|
| EP-34 | Part of a title | `design` | Design Patterns, Domain-Driven Design | As expected | Pass |
| EP-35 | Author, different letter case | `FOWLER` | Refactoring | As expected | Pass |
| EP-36 | Full ISBN | `9780132350884` | Clean Code | As expected | Pass |
| EP-37 | Surrounding spaces | `"  clean  "` | Clean Code | As expected | Pass |
| EP-38 | Empty | `""` | All 5 books, sorted by title | As expected | Pass |
| EP-39 | No matching book | `zzzz` | Empty list | As expected | Pass |
| EP-40 | SQL injection text | `' OR 1=1 --` | Empty list | As expected | Pass |
| EP-41 | Special character | `%` | Empty list | **All 5 books** | **Fail (BB-01)** |
| EP-42 | Special character | `_` | Empty list | **All 5 books** | **Fail (BB-01)** |
| EP-43 | ISBN with dashes | `978-0-13-235088-4` | Clean Code | **Empty list** | **Fail (BB-02)** |

### EP-E Borrow: `bookId` (F-05)

| ID | Class | Type | Test value | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| EP-44 | Existing book | Valid | `1` | 201 | 201 | Pass |
| EP-45 | Missing | Invalid | *(none)* | 400, no loan | As expected | Pass |
| EP-46 | Negative | Invalid | `-1` | 400, no loan | As expected | Pass |
| EP-47 | Decimal | Invalid | `1.5` | 400, no loan | As expected | Pass |
| EP-48 | Text | Invalid | `abc` | 400, no loan | As expected | Pass |
| EP-49 | No such book | Invalid | `999` | 404 | 404 | Pass |
| EP-50 | Boolean | Invalid | `true` | 400 | **201, book 1 borrowed** | **Fail (BB-04)** |
| EP-51 | List | Invalid | `[2]` | 400 | **201, book 2 borrowed** | **Fail (BB-04)** |

### EP-F Request format (F-09)
Rule: *correct HTTP status codes; no unhandled server errors (HTTP 500)* (test plan 1.4).

| ID | Class | Type | Test value | Expected | Actual | Status |
|---|---|---|---|---|---|---|
| EP-52 | JSON body | Valid | Login request | 200 | 200 | Pass |
| EP-53 | Malformed JSON | Invalid | `{"email": ` | 400 | 400 | Pass |
| EP-54 | Unknown route | Invalid | `/api/nothing` | 404 | 404 | Pass |
| EP-55 | Body too large | Invalid | 200,000-character password | 413 | **500** | **Fail (BB-05)** |
| EP-56 | Badly encoded URL | Invalid | `/api/books/%E0%A4%A` | 400 | **500** | **Fail (BB-06)** |

---

## 3.3 Boundary Value Analysis

Errors are most likely at the edges of a range. Three values are tested per boundary (just below, on, and just above), where such a value exists. **All 61 tests passed.** In the tables, ✔ means accepted and ✘ means rejected with HTTP 400; every actual result matched.

### BVA-A to BVA-D: numeric fields

| IDs | Field and valid range | Values tested and expected result | Status |
|---|---|---|---|
| BVA-01 to 06 | Year: 1450 to current year (2026) | 1449 ✘, 1450 ✔, 1451 ✔, 2025 ✔, 2026 ✔, 2027 ✘ | Pass |
| BVA-07 | Year: the upper limit follows the calendar | With the clock in 2027: 2027 ✔, 2028 ✘ | Pass |
| BVA-08 to 13 | Copies: 1 to 50 | 0 ✘, 1 ✔, 2 ✔, 49 ✔, 50 ✔, 51 ✘ | Pass |
| BVA-14 to 16 | Edit copies while 2 are on loan: minimum 2 | 1 ✘, 2 ✔, 3 ✔ | Pass |
| BVA-17 to 19 | Active loans: maximum 3 | Already holding 1 ✔, 2 ✔ (3rd loan), 3 ✘ (4th loan) | Pass |

### BVA-E: due date and overdue status (date fields)
Book borrowed 2026-03-01 10:00:00 UTC, so it is due 2026-03-15 10:00:00 UTC.

| ID | Boundary | Expected | Status |
|---|---|---|---|
| BVA-20 | Due date | Exactly 14 days after borrowing | Pass |
| BVA-21 | 1 second before the due time | `borrowed` | Pass |
| BVA-22 | Exactly at the due time | `borrowed` | Pass |
| BVA-23 | 1 second after the due time | `overdue` | Pass |
| BVA-24 | Leap year: borrowed 2028-02-15 | Due 2028-02-29 | Pass |
| BVA-25 | Non-leap year: borrowed 2027-02-15 | Due 2027-03-01 | Pass |
| BVA-26 | Year end: borrowed 2026-12-18 | Due 2027-01-01 | Pass |

### BVA-F: late fine ($1 per started day, maximum $20)

| ID | Returned | Expected fine | Status |
|---|---|---|---|
| BVA-27 | 1 second early | $0 | Pass |
| BVA-28 | Exactly on time | $0 | Pass |
| BVA-29 | 1 second late | $1 | Pass |
| BVA-30 | Exactly 1 day late | $1 | Pass |
| BVA-31 | 1 day + 1 second late | $2 | Pass |
| BVA-32 | 19 days late | $19 | Pass |
| BVA-33 | 20 days late | $20 | Pass |
| BVA-34 | 20 days + 1 second late | $20 (cap) | Pass |
| BVA-35 | 21 days late | $20 (cap) | Pass |

### BVA-G: field lengths

| IDs | Field and valid length | Lengths tested and expected result | Status |
|---|---|---|---|
| BVA-36 to 38 | Password: at least 8 | 7 ✘, 8 ✔, 9 ✔ | Pass |
| BVA-39 to 43 | Name: 1 to 50 | 0 ✘, 1 ✔, 49 ✔, 50 ✔, 51 ✘ | Pass |
| BVA-44 to 48 | Title: 1 to 200 | 0 ✘, 1 ✔, 199 ✔, 200 ✔, 201 ✘ | Pass |
| BVA-49 to 53 | Author: 1 to 100 | 0 ✘, 1 ✔, 99 ✔, 100 ✔, 101 ✘ | Pass |
| BVA-54 to 59 | ISBN: exactly 10 or 13 digits | 9 ✘, 10 ✔, 11 ✘, 12 ✘, 13 ✔, 14 ✘ | Pass |

### BVA-H: login session (valid for 8 hours)

| ID | Time after login | Expected | Status |
|---|---|---|---|
| BVA-60 | 7 h 59 min 59 s | 200, still logged in | Pass |
| BVA-61 | 8 h 0 min 1 s | 401, session expired | Pass |

The exact 8-hour instant is not tested because the README does not say whether it is inside or outside the session.

---

## 3.4 Decision Tables

Each column (rule) is one combination of conditions and becomes one test. **Y** = true, **N** = false, **–** = does not matter. The *Combinations covered* row adds up to the full table, which shows that no combination is missing. **All 23 tests passed.**

### DT1: Login (F-02)

| Conditions | R1 | R2 | R3 | R4 | R5 |
|---|---|---|---|---|---|
| C1 Email given | N | Y | Y | Y | Y |
| C2 Password given | – | N | Y | Y | Y |
| C3 Account exists | – | – | N | Y | Y |
| C4 Password matches | – | – | – | N | Y |
| *Combinations covered (2⁴ = 16)* | *8* | *4* | *2* | *1* | *1* |
| **Actions** | | | | | |
| A1 400 "Email and password are required" | X | X | | | |
| A2 401 "Invalid email or password" | | | X | X | |
| A3 200, token and user returned | | | | | X |
| **Status** | Pass | Pass | Pass | Pass | Pass |

R3 and R4 must return the same message, so that nobody can find out which emails are registered.

### DT2: Borrow a book (F-05)

| Conditions | R1 | R2 | R3 | R4 | R5 | R6 | R7 |
|---|---|---|---|---|---|---|---|
| C1 Logged in | N | Y | Y | Y | Y | Y | Y |
| C2 `bookId` is valid | – | N | Y | Y | Y | Y | Y |
| C3 Book exists | – | – | N | Y | Y | Y | Y |
| C4 User already holds this book | – | – | – | Y | N | N | N |
| C5 User holds fewer than 3 books | – | – | – | – | N | Y | Y |
| C6 A copy is available | – | – | – | – | – | N | Y |
| *Combinations covered (2⁶ = 64)* | *32* | *16* | *8* | *4* | *2* | *1* | *1* |
| **Actions** | | | | | | | |
| A1 401 Please log in | X | | | | | | |
| A2 400 Invalid `bookId` | | X | | | | | |
| A3 404 Book not found | | | X | | | | |
| A4 409 You already have this book | | | | X | | | |
| A5 400 More than 3 books | | | | | X | | |
| A6 400 No copies available | | | | | | X | |
| A7 201 Loan created, available count drops by 1 | | | | | | | X |
| **Status** | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

Extra tests for the "–" entries, where two rules are broken at once. The README does not say which message comes first, so these check that the request is rejected and no loan is created.

| ID | Combination | Expected | Status |
|---|---|---|---|
| DT2-R4b | Already holds this book **and** holds 3 books | Rejected, no new loan | Pass |
| DT2-R4c | Already holds this book **and** it was the last copy | Rejected, no new loan | Pass |
| DT2-R5b | Holds 3 books **and** no copy is available | Rejected, no new loan | Pass |

### DT3: Delete a user (F-10)

| Conditions | R1 | R2 | R3 | R4 | R5 | R6 | R7 |
|---|---|---|---|---|---|---|---|
| C1 Caller's role | Guest | Member | Admin | Admin | Admin | Admin | Admin |
| C2 User id is valid | – | – | N | Y | Y | Y | Y |
| C3 User exists | – | – | – | N | Y | Y | Y |
| C4 It is the caller's own account | – | – | – | – | Y | N | N |
| C5 User has books on loan | – | – | – | – | – | Y | N |
| *Combinations covered (3 × 2⁴ = 48)* | *16* | *16* | *8* | *4* | *2* | *1* | *1* |
| **Actions** | | | | | | | |
| A1 401 Please log in | X | | | | | | |
| A2 403 Only admins can do this | | X | | | | | |
| A3 400 Invalid id | | | X | | | | |
| A4 404 User not found | | | | X | | | |
| A5 400 Cannot delete your own account | | | | | X | | |
| A6 409 User has books on loan | | | | | | X | |
| A7 204 User deleted | | | | | | | X |
| **Status** | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

R7 has a second test (DT3-R7b, Pass): the user borrowed a book and returned it, so "books on loan" is false again and the user can be deleted.

---

## 3.5 Results

| Technique | Tests | Passed | Failed |
|---|---|---|---|
| Equivalence Partitioning | 56 | 47 | 9 |
| Boundary Value Analysis | 61 | 61 | 0 |
| Decision tables | 23 | 23 | 0 |
| **Total** | **140** | **131 (93.6 %)** | **9 (6.4 %)** |

### Defects found
The 9 failed tests come from **6 defects**. The severities are proposals, to be confirmed when the defects are logged (task 3.8).

| ID | Feature | Defect | Steps to reproduce | Expected | Actual | Severity | Tests |
|---|---|---|---|---|---|---|---|
| BB-01 | F-03 | `%` and `_` act as wildcards in book search | Books → search `%` | No books | All books listed | Medium | EP-41, EP-42 |
| BB-02 | F-03 | Dashed ISBN is accepted when adding a book but not when searching | Books → search `978-0-13-235088-4` | Clean Code | No books | Low | EP-43 |
| BB-03 | F-01 | Malformed email domains are accepted | Register with `sam@test..com` | Validation error | Account created | Medium | EP-13, EP-14 |
| BB-04 | F-05 | `bookId` that is not a number is converted and accepted | `POST /api/loans` with `{"bookId": true}` | 400 | 201, book 1 borrowed | Medium | EP-50, EP-51 |
| BB-05 | F-09 | Oversized request body causes a server error | `POST /api/auth/login` with a 200,000-character password | 413 | 500 | Medium | EP-55 |
| BB-06 | F-09 | Badly encoded URL causes a server error | `GET /api/books/%E0%A4%A` | 400 | 500 | Medium | EP-56 |

BB-05 and BB-06 also break the Reliability target of the test plan ("no unhandled server errors").

### Requirement gaps
These are not counted as defects because the README does not define the behaviour. The group should decide what is correct.

1. **ISBN check digit** is not verified: `0000000000` is accepted.
2. **ISBN-10 ending in X** (e.g. `080442957X`) is a real ISBN format but is rejected by the "10 digits" rule.
3. **No maximum length** for email and password.
4. **Loan limit for admins**: the README says "a member can hold at most 3 books" but does not say whether this includes admins.
5. **Order of error messages** when several borrowing rules are broken is not defined.

### Conclusion
All tested boundaries and decision rules work as specified, including the high-risk features F-05, F-06 and F-10. All defects were found by invalid or unusual classes in Equivalence Partitioning, so input handling (search, email, `bookId`, request errors) is the area to improve first. No Critical or High defects were found in this task.
