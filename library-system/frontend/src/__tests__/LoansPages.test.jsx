import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MyLoansPage from '../pages/MyLoansPage';
import AllLoansPage from '../pages/AllLoansPage';
import { api } from '../api';
import { renderPage, MEMBER, ADMIN } from '../test-utils';

vi.mock('../api', () => ({
  api: { getMyLoans: vi.fn(), getAllLoans: vi.fn(), returnLoan: vi.fn() },
}));

const LOANS = [
  { id: 2, book_title: 'Refactoring', user_name: 'Jane Member', borrowed_at: '2026-03-01T10:00:00Z', due_at: '2026-03-15T10:00:00Z', returned_at: null, status: 'overdue', fine: 0 },
  { id: 1, book_title: 'Clean Code', user_name: 'Jane Member', borrowed_at: '2026-02-01T10:00:00Z', due_at: '2026-02-15T10:00:00Z', returned_at: '2026-02-10T10:00:00Z', status: 'returned', fine: 0 },
];

beforeEach(() => {
  vi.clearAllMocks();
  api.getMyLoans.mockResolvedValue({ loans: LOANS });
  api.getAllLoans.mockResolvedValue({ loans: LOANS });
});

describe('MyLoansPage', () => {
  test('lists loans with their status and only offers Return for open loans', async () => {
    renderPage(<MyLoansPage />, { user: MEMBER });

    const openLoan = await screen.findByTestId('loan-row-2');
    expect(within(openLoan).getByText('overdue')).toBeInTheDocument();
    expect(within(openLoan).getByRole('button', { name: 'Return' })).toBeInTheDocument();

    const returnedLoan = screen.getByTestId('loan-row-1');
    expect(within(returnedLoan).queryByRole('button', { name: 'Return' })).not.toBeInTheDocument();
    expect(screen.queryByText('Member')).not.toBeInTheDocument();
  });

  test('shows the late fine after returning', async () => {
    api.returnLoan.mockResolvedValue({ loan: { fine: 5 } });
    renderPage(<MyLoansPage />, { user: MEMBER });

    await userEvent.click(await screen.findByRole('button', { name: 'Return' }));

    expect(api.returnLoan).toHaveBeenCalledWith(2);
    expect(await screen.findByRole('status')).toHaveTextContent('"Refactoring" returned. Late fine: $5.');
  });

  test('no fine text when returned on time', async () => {
    api.returnLoan.mockResolvedValue({ loan: { fine: 0 } });
    renderPage(<MyLoansPage />, { user: MEMBER });

    await userEvent.click(await screen.findByRole('button', { name: 'Return' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/^"Refactoring" returned\.$/);
  });

  test('shows an error when returning fails', async () => {
    api.returnLoan.mockRejectedValue(new Error('This book has already been returned'));
    renderPage(<MyLoansPage />, { user: MEMBER });

    await userEvent.click(await screen.findByRole('button', { name: 'Return' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already been returned');
  });

  test('shows a message when there are no loans', async () => {
    api.getMyLoans.mockResolvedValue({ loans: [] });
    renderPage(<MyLoansPage />, { user: MEMBER });
    expect(await screen.findByText('No loans yet.')).toBeInTheDocument();
  });

  test('shows an error if loans cannot be loaded', async () => {
    api.getMyLoans.mockRejectedValue(new Error('Please log in first'));
    renderPage(<MyLoansPage />, { user: MEMBER });
    expect(await screen.findByRole('alert')).toHaveTextContent('Please log in first');
  });
});

describe('AllLoansPage', () => {
  test('shows the member column and lets the admin return a book', async () => {
    api.returnLoan.mockResolvedValue({ loan: { fine: 0 } });
    renderPage(<AllLoansPage />, { user: ADMIN });

    expect(await screen.findByRole('columnheader', { name: 'Member' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Return' }));

    expect(await screen.findByRole('status')).toHaveTextContent('"Refactoring" returned for Jane Member.');
  });

  test('shows an error when returning fails', async () => {
    api.returnLoan.mockRejectedValue(new Error('Loan not found'));
    renderPage(<AllLoansPage />, { user: ADMIN });

    await userEvent.click(await screen.findByRole('button', { name: 'Return' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Loan not found');
  });

  test('shows an error if loans cannot be loaded', async () => {
    api.getAllLoans.mockRejectedValue(new Error('Only admins can do this'));
    renderPage(<AllLoansPage />, { user: ADMIN });
    expect(await screen.findByRole('alert')).toHaveTextContent('Only admins can do this');
  });
});
