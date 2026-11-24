const {
  LOAN_DAYS,
  MAX_FINE,
  calculateDueDate,
  daysLate,
  calculateFine,
  getLoanStatus,
} = require('../../src/utils/loanRules');

const DUE = '2026-03-15T10:00:00.000Z';

describe('calculateDueDate', () => {
  test(`is ${LOAN_DAYS} days after borrowing`, () => {
    expect(calculateDueDate('2026-03-01T10:00:00.000Z').toISOString()).toBe(DUE);
  });
});

describe('daysLate', () => {
  test.each([
    ['2026-03-14T10:00:00.000Z', 0], // early
    [DUE, 0], // exactly on time
    ['2026-03-15T10:00:01.000Z', 1], // one second late counts as a day
    ['2026-03-16T10:00:00.000Z', 1],
    ['2026-03-20T09:00:00.000Z', 5],
  ])('returned %s -> %i days late', (returnedAt, expected) => {
    expect(daysLate(DUE, returnedAt)).toBe(expected);
  });
});

describe('calculateFine', () => {
  test('no fine when returned on time', () => {
    expect(calculateFine(DUE, DUE)).toBe(0);
  });

  test('$1 per day late', () => {
    expect(calculateFine(DUE, '2026-03-18T10:00:00.000Z')).toBe(3);
  });

  test('fine reaches the cap at 20 days', () => {
    expect(calculateFine(DUE, '2026-04-04T10:00:00.000Z')).toBe(MAX_FINE);
  });

  test('fine never goes above the cap', () => {
    expect(calculateFine(DUE, '2026-12-31T10:00:00.000Z')).toBe(MAX_FINE);
  });
});

describe('getLoanStatus', () => {
  test('returned loan', () => {
    expect(getLoanStatus({ due_at: DUE, returned_at: '2026-03-10T00:00:00Z' }, '2026-05-01')).toBe('returned');
  });

  test('active loan before the due date', () => {
    expect(getLoanStatus({ due_at: DUE, returned_at: null }, '2026-03-10T00:00:00Z')).toBe('borrowed');
  });

  test('active loan after the due date', () => {
    expect(getLoanStatus({ due_at: DUE, returned_at: null }, '2026-03-16T00:00:00Z')).toBe('overdue');
  });
});
