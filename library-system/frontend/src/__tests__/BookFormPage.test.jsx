import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookFormPage from '../pages/BookFormPage';
import { api } from '../api';
import { renderPage, expectNavigatedTo, ADMIN } from '../test-utils';

vi.mock('../api', () => ({
  api: { getBook: vi.fn(), createBook: vi.fn(), updateBook: vi.fn() },
}));

beforeEach(() => vi.clearAllMocks());

const renderAdd = () => renderPage(<BookFormPage />, { user: ADMIN, route: '/books/new', path: '/books/new' });
const renderEdit = () => renderPage(<BookFormPage />, { user: ADMIN, route: '/books/1/edit', path: '/books/:id/edit' });

test('adds a new book (year and copies are sent as numbers)', async () => {
  api.createBook.mockResolvedValue({ book: { id: 6 } });
  renderAdd();

  expect(screen.getByRole('heading')).toHaveTextContent('Add Book');
  await userEvent.type(screen.getByLabelText('Title'), 'Test Book');
  await userEvent.type(screen.getByLabelText('Author'), 'Tester');
  await userEvent.type(screen.getByLabelText('ISBN'), '0306406152');
  await userEvent.type(screen.getByLabelText('Year'), '2020');
  await userEvent.clear(screen.getByLabelText('Copies'));
  await userEvent.type(screen.getByLabelText('Copies'), '4');
  await userEvent.click(screen.getByRole('button', { name: 'Add book' }));

  expect(api.createBook).toHaveBeenCalledWith({
    title: 'Test Book', author: 'Tester', isbn: '0306406152', year: 2020, copies: 4,
  });
  await expectNavigatedTo('/');
});

test('shows validation errors from the server', async () => {
  const error = Object.assign(new Error('Validation failed'), {
    details: ['Title is required', 'ISBN must be 10 or 13 digits'],
  });
  api.createBook.mockRejectedValue(error);
  renderAdd();

  await userEvent.click(screen.getByRole('button', { name: 'Add book' }));

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent('Title is required');
  expect(alert).toHaveTextContent('ISBN must be 10 or 13 digits');
});

test('Cancel goes back to the book list', async () => {
  renderAdd();
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  await expectNavigatedTo('/');
});

test('edits an existing book', async () => {
  api.getBook.mockResolvedValue({
    book: { id: 1, title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', year: 2008, copies: 3 },
  });
  api.updateBook.mockResolvedValue({ book: {} });
  renderEdit();

  expect(await screen.findByDisplayValue('Clean Code')).toBeInTheDocument();
  expect(screen.getByRole('heading')).toHaveTextContent('Edit Book');

  await userEvent.clear(screen.getByLabelText('Copies'));
  await userEvent.type(screen.getByLabelText('Copies'), '5');
  await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

  expect(api.updateBook).toHaveBeenCalledWith('1', expect.objectContaining({ title: 'Clean Code', copies: 5, year: 2008 }));
  await expectNavigatedTo('/');
});

test('shows an error if the book to edit is not found', async () => {
  api.getBook.mockRejectedValue(new Error('Book not found'));
  renderEdit();
  expect(await screen.findByRole('alert')).toHaveTextContent('Book not found');
});
