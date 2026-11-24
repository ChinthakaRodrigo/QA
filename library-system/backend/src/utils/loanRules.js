// Business rules for borrowing books. Plain functions so they are easy to unit test.

const LOAN_DAYS = 14; // a book is lent for 14 days
const MAX_ACTIVE_LOANS = 3; // a member can hold at most 3 books at a time
const FINE_PER_DAY = 1; // $1 for every day late
const MAX_FINE = 20; // fines are capped at $20

const DAY_MS = 24 * 60 * 60 * 1000;

function calculateDueDate(borrowedAt) {
  return new Date(new Date(borrowedAt).getTime() + LOAN_DAYS * DAY_MS);
}

// Number of started days between the due date and the return date (0 if on time).
function daysLate(dueAt, returnedAt) {
  const diff = new Date(returnedAt).getTime() - new Date(dueAt).getTime();
  return diff > 0 ? Math.ceil(diff / DAY_MS) : 0;
}

function calculateFine(dueAt, returnedAt) {
  return Math.min(daysLate(dueAt, returnedAt) * FINE_PER_DAY, MAX_FINE);
}

// Returns 'returned', 'overdue' or 'borrowed'.
function getLoanStatus(loan, now) {
  if (loan.returned_at) return 'returned';
  return new Date(now) > new Date(loan.due_at) ? 'overdue' : 'borrowed';
}

module.exports = {
  LOAN_DAYS,
  MAX_ACTIVE_LOANS,
  FINE_PER_DAY,
  MAX_FINE,
  calculateDueDate,
  daysLate,
  calculateFine,
  getLoanStatus,
};
