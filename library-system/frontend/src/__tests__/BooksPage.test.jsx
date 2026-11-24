import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BooksPage from '../pages/BooksPage';
import { api } from '../api';
import { renderPage, MEMBER, ADMIN } from '../test-utils';

vi.mock('../api', () => ({
  api: { getBooks: vi.fn(), borrowBook: vi.fn(), deleteBook: vi.fn() },
}));

const BOOKS = [
  { id: 1, title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', year: 2008, copies: 3, available: 2 },
  { id: 3, title: 'Design Patterns', author: 'Erich Gamma', isbn: '9780201633610', year: 1994, copies: 1, available: 0 },
];

beforeEach(() => {
  vi.clearAllMocks();
  api.getBooks.mockResolvedValue({ books: BOOKS });
});

test('guest sees the books but no Borrow button', async () => {
  renderPage(<BooksPage />);
  expect(await screen.findByText('Clean Code')).toBeInTheDocument();
  expect(screen.getByText('2 / 3')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Borrow' })).not.toBeInTheDocument();
  expect(screen.getByText(/to borrow books/)).toBeInTheDocument();
});

test('shows a message when there are no books', async () => {
  api.getBooks.mockResolvedValue({ books: [] });
  renderPage(<BooksPage />);
  expect(await screen.findByText('No books found.')).toBeInTheDocument();
});

test('shows an error if books cannot be loaded', async () => {
  api.getBooks.mockRejectedValue(new Error('Server is down'));
  renderPage(<BooksPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Server is down');
});

test('searches with the typed text', async () => {
  renderPage(<BooksPage />);
  await userEvent.type(screen.getByLabelText('Search books'), 'clean');
  await userEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(api.getBooks).toHaveBeenLastCalledWith('clean');
});

test('member can borrow an available book', async () => {
  api.borrowBook.mockResolvedValue({ loan: {} });
  renderPage(<BooksPage />, { user: MEMBER });

  const row = await screen.findByTestId('book-row-1');
  await userEvent.click(within(row).getByRole('button', { name: 'Borrow' }));

  expect(api.borrowBook).toHaveBeenCalledWith(1);
  expect(await screen.findByRole('status')).toHaveTextContent('You borrowed "Clean Code"');
});

test('Borrow is disabled when no copies are available', async () => {
  renderPage(<BooksPage />, { user: MEMBER });
  const row = await screen.findByTestId('book-row-3');
  expect(within(row).getByRole('button', { name: 'Borrow' })).toBeDisabled();
});

test('shows the error when borrowing fails', async () => {
  api.borrowBook.mockRejectedValue(new Error('You cannot borrow more than 3 books at a time'));
  renderPage(<BooksPage />, { user: MEMBER });

  const row = await screen.findByTestId('book-row-1');
  await userEvent.click(within(row).getByRole('button', { name: 'Borrow' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('more than 3 books');
});

test('member does not see Edit or Delete', async () => {
  renderPage(<BooksPage />, { user: MEMBER });
  await screen.findByText('Clean Code');
  expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  expect(screen.queryByText('Delete')).not.toBeInTheDocument();
});

test('admin can delete a book after confirming', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  api.deleteBook.mockResolvedValue(null);
  renderPage(<BooksPage />, { user: ADMIN });

  const row = await screen.findByTestId('book-row-1');
  expect(within(row).getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/books/1/edit');
  await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));

  expect(api.deleteBook).toHaveBeenCalledWith(1);
  expect(await screen.findByRole('status')).toHaveTextContent('"Clean Code" was deleted.');
});

test('nothing is deleted when the admin cancels', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(false);
  renderPage(<BooksPage />, { user: ADMIN });

  const row = await screen.findByTestId('book-row-1');
  await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));
  expect(api.deleteBook).not.toHaveBeenCalled();
});

test('shows the error when delete fails', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  api.deleteBook.mockRejectedValue(new Error('This book cannot be deleted while copies are on loan'));
  renderPage(<BooksPage />, { user: ADMIN });

  const row = await screen.findByTestId('book-row-1');
  await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('cannot be deleted');
});
