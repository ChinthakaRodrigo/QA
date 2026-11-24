// Task 3.5 - TDD. These tests were written BEFORE checkRenewal existed (red -> green -> refactor).
// New business rule: a member may renew (extend) an active loan by another LOAN_DAYS,
// at most MAX_RENEWALS times, and only while the loan is not overdue.
const { LOAN_DAYS, MAX_RENEWALS, checkRenewal } = require('../../src/utils/loanRules');

const BORROWED = '2026-03-01T10:00:00.000Z';
const DUE = '2026-03-15T10:00:00.000Z';
const BEFORE_DUE = '2026-03-10T10:00:00.000Z';

function activeLoan(overrides = {}) {
  return { borrowed_at: BORROWED, due_at: DUE, returned_at: null, renewals: 0, ...overrides };
}

describe('checkRenewal - allowed', () => {
  test('an active loan that is not overdue can be renewed', () => {
    expect(checkRenewal(activeLoan(), BEFORE_DUE).allowed).toBe(true);
  });

  test(`the new due date is ${LOAN_DAYS} days after the current due date (not after today)`, () => {
    const result = checkRenewal(activeLoan(), BEFORE_DUE);
    expect(result.newDueAt.toISOString()).toBe('2026-03-29T10:00:00.000Z');
  });

  test('renewing exactly at the due date is still allowed (not overdue yet)', () => {
    expect(checkRenewal(activeLoan(), DUE).allowed).toBe(true);
  });

  test('a loan without a renewals field counts as never renewed', () => {
    const { renewals, ...loan } = activeLoan();
    expect(checkRenewal(loan, BEFORE_DUE)).toMatchObject({ allowed: true, renewalsLeft: MAX_RENEWALS - 1 });
  });

  test('reports how many renewals are left after this one', () => {
    expect(checkRenewal(activeLoan({ renewals: 0 }), BEFORE_DUE).renewalsLeft).toBe(MAX_RENEWALS - 1);
    expect(checkRenewal(activeLoan({ renewals: MAX_RENEWALS - 1 }), BEFORE_DUE).renewalsLeft).toBe(0);
  });
});

describe('checkRenewal - refused', () => {
  test('a returned loan cannot be renewed', () => {
    const result = checkRenewal(activeLoan({ returned_at: '2026-03-05T10:00:00.000Z' }), BEFORE_DUE);
    expect(result).toEqual({ allowed: false, reason: 'This book has already been returned' });
  });

  test('an overdue loan cannot be renewed (one second late is enough)', () => {
    const result = checkRenewal(activeLoan(), '2026-03-15T10:00:01.000Z');
    expect(result).toEqual({ allowed: false, reason: 'Overdue books cannot be renewed' });
  });

  test(`a loan already renewed ${MAX_RENEWALS} times cannot be renewed again`, () => {
    const result = checkRenewal(activeLoan({ renewals: MAX_RENEWALS }), BEFORE_DUE);
    expect(result).toEqual({
      allowed: false,
      reason: `A loan can be renewed at most ${MAX_RENEWALS} times`,
    });
  });

  test('a returned loan reports "returned" even if it is also over the limit', () => {
    const loan = activeLoan({ returned_at: '2026-03-05T10:00:00.000Z', renewals: MAX_RENEWALS });
    expect(checkRenewal(loan, '2026-05-01T10:00:00.000Z').reason).toBe('This book has already been returned');
  });

  test('an overdue loan reports "overdue" before the renewal limit', () => {
    const loan = activeLoan({ renewals: MAX_RENEWALS });
    expect(checkRenewal(loan, '2026-03-20T10:00:00.000Z').reason).toBe('Overdue books cannot be renewed');
  });
});

describe('checkRenewal - boundary on the renewal count', () => {
  test.each([
    [0, true],
    [1, true],
    [2, false],
    [3, false],
  ])('renewals = %i -> allowed %s', (renewals, expected) => {
    expect(checkRenewal(activeLoan({ renewals }), BEFORE_DUE).allowed).toBe(expected);
  });

  test('MAX_RENEWALS is 2', () => {
    expect(MAX_RENEWALS).toBe(2);
  });
});
