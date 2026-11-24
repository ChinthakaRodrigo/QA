# 3.8 Defect Tracking and Root Cause Analysis

## Tracking method

The black-box suite identified six defects in 140 test cases (see [Black-Box Testing](03-black-box-testing.md)). This register uses issue IDs and fields that can be copied into GitHub Issues, Jira or Bugzilla. No external tracker is configured for this checkout, so the records are kept with the project. Severity is the proposal from the test report; the team should confirm it during triage.

## Defect register

| ID | Summary | Severity | Evidence | Status |
|---|---|---|---|---|
| BB-01 | `%` and `_` are treated as wildcards in book search | Medium | EP-41, EP-42; `GET /api/books?search=%25` returns all books | New |
| BB-02 | Search does not normalize dashes in ISBNs | Low | EP-43; searching `978-0-13-235088-4` does not find *Clean Code* | New |
| BB-03 | Registration accepts malformed email domains | Medium | EP-13, EP-14; `sam@test..com` and `sam@.test.com` return 201 | New |
| BB-04 | Non-numeric JSON `bookId` values can create loans | Medium | EP-50, EP-51; `true` or `[2]` returns 201 before the fix | Closed |
| BB-05 | Oversized login body returns 500 instead of 413 | Medium | EP-55; 200,000-character password causes HTTP 500 | New |
| BB-06 | Malformed percent-encoded path returns 500 instead of 400 | Medium | EP-56; `GET /api/books/%E0%A4%A` causes HTTP 500 | New |

## Root cause analysis

### BB-04 — invalid `bookId` coercion

**Impact:** A malformed borrow request can create a loan against a real book and reduce its available-copy count. The failing examples are JSON `true` (coerced to ID `1`) and `[2]` (coerced to ID `2`).

**Root cause:** `parseId` converted every input with `Number(value)` before checking whether the result was a positive integer. JavaScript converts booleans and single-element arrays to numbers, so the numeric check accepted values that were not IDs in the request contract.

**Correction:** `parseId` now accepts only a string (route parameter) or number (JSON ID) before conversion. The black-box tests for `true` and `[2]` are active regression tests and assert both HTTP 400 and that no loan was created.

### BB-05 — oversized request error mapping

**Impact:** A client mistake is reported as an internal server failure, obscuring the real cause and making reliability monitoring noisy.

**Root cause:** The Express JSON parser rejects oversized bodies, but the application error handler treats parser errors other than malformed JSON as generic internal errors instead of mapping the parser's `entity.too.large` error to HTTP 413.

**Recommended correction:** Map known body-parser errors by their stable error type/status, return a bounded client error response, and add a regression test that confirms the server does not return 500. BB-05 remains open until that change is implemented and verified.

## BB-04 lifecycle record

| State | Record |
|---|---|
| **New** | 2026-11-24 — EP-50 and EP-51 reproduced the issue: `bookId: true` and `bookId: [2]` created loans rather than returning 400. |
| **Assigned** | 2026-11-24 — Assigned to the backend development role for request-ID validation. |
| **Fixed** | 2026-11-24 — `backend/src/utils/validation.js` rejects values other than strings and numbers before numeric conversion. |
| **Verified** | 2026-11-24 — EP-50/EP-51 passed in the full backend run: each returned HTTP 400 and left the member's loan list empty. The suite reported 363/363 tests passed. |
| **Closed** | 2026-11-24 — Closed after the regression run passed. |

The test run used the locked backend dependencies. The defect is closed in this local register; copy the lifecycle record to the team's issue tracker if one is selected.

## Remaining work

BB-01, BB-02, BB-03, BB-05 and BB-06 remain open. Prioritize BB-03 and BB-05/BB-06 because they affect input validation and error handling; fix each with a failing regression test before changing its issue status.
