import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UsersPage from '../pages/UsersPage';
import UserFormPage from '../pages/UserFormPage';
import { api } from '../api';
import { renderPage, expectNavigatedTo, ADMIN } from '../test-utils';

vi.mock('../api', () => ({
  api: { getUsers: vi.fn(), getUser: vi.fn(), createUser: vi.fn(), updateUser: vi.fn(), deleteUser: vi.fn() },
}));

const USERS = [
  { id: 1, name: 'Admin User', email: 'admin@library.com', role: 'admin', active_loans: 0 },
  { id: 2, name: 'Jane Member', email: 'jane@library.com', role: 'member', active_loans: 2 },
];

beforeEach(() => {
  vi.clearAllMocks();
  api.getUsers.mockResolvedValue({ users: USERS });
});

describe('UsersPage', () => {
  const renderUsers = () => renderPage(<UsersPage />, { user: ADMIN });

  test('lists users with role and books on loan', async () => {
    renderUsers();
    const row = await screen.findByTestId('user-row-2');
    expect(row).toHaveTextContent('jane@library.com');
    expect(row).toHaveTextContent('member');
    expect(row).toHaveTextContent('2');
    expect(within(row).getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/admin/users/2/edit');
    expect(screen.getByRole('link', { name: 'Add User' })).toHaveAttribute('href', '/admin/users/new');
  });

  test('the admin cannot delete their own row', async () => {
    renderUsers();
    const ownRow = await screen.findByTestId('user-row-1');
    expect(within(ownRow).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  test('searches with the typed text', async () => {
    renderUsers();
    await userEvent.type(screen.getByLabelText('Search users'), 'jane');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(api.getUsers).toHaveBeenLastCalledWith('jane');
  });

  test('shows a message when no users match', async () => {
    api.getUsers.mockResolvedValue({ users: [] });
    renderUsers();
    expect(await screen.findByText('No users found.')).toBeInTheDocument();
  });

  test('shows an error if users cannot be loaded', async () => {
    api.getUsers.mockRejectedValue(new Error('Only admins can do this'));
    renderUsers();
    expect(await screen.findByRole('alert')).toHaveTextContent('Only admins can do this');
  });

  test('deletes a user after confirming', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.deleteUser.mockResolvedValue(null);
    renderUsers();

    const row = await screen.findByTestId('user-row-2');
    await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));

    expect(api.deleteUser).toHaveBeenCalledWith(2);
    expect(await screen.findByRole('status')).toHaveTextContent('User "Jane Member" was deleted.');
  });

  test('does nothing when the delete is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderUsers();
    const row = await screen.findByTestId('user-row-2');
    await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    expect(api.deleteUser).not.toHaveBeenCalled();
  });

  test('shows the error when delete fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.deleteUser.mockRejectedValue(new Error('This user cannot be deleted while they have books on loan'));
    renderUsers();

    const row = await screen.findByTestId('user-row-2');
    await userEvent.click(within(row).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('books on loan');
  });
});

describe('UserFormPage', () => {
  const renderAdd = () => renderPage(<UserFormPage />, { user: ADMIN, route: '/admin/users/new', path: '/admin/users/new' });
  const renderEdit = () =>
    renderPage(<UserFormPage />, { user: ADMIN, route: '/admin/users/2/edit', path: '/admin/users/:id/edit' });

  test('adds a new admin user', async () => {
    api.createUser.mockResolvedValue({ user: { id: 3 } });
    renderAdd();

    expect(screen.getByRole('heading')).toHaveTextContent('Add User');
    await userEvent.type(screen.getByLabelText('Name'), 'Tom');
    await userEvent.type(screen.getByLabelText('Email'), 'tom@test.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Reader123');
    await userEvent.selectOptions(screen.getByLabelText('Role'), 'admin');
    await userEvent.click(screen.getByRole('button', { name: 'Add user' }));

    expect(api.createUser).toHaveBeenCalledWith({ name: 'Tom', email: 'tom@test.com', password: 'Reader123', role: 'admin' });
    await expectNavigatedTo('/admin/users');
  });

  test('shows validation errors from the server', async () => {
    const error = Object.assign(new Error('Validation failed'), { details: ['Name is required'] });
    api.createUser.mockRejectedValue(error);
    renderAdd();

    await userEvent.click(screen.getByRole('button', { name: 'Add user' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Name is required');
  });

  test('edits a user and keeps the password empty', async () => {
    api.getUser.mockResolvedValue({ user: USERS[1] });
    api.updateUser.mockResolvedValue({ user: {} });
    renderEdit();

    expect(await screen.findByDisplayValue('Jane Member')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toHaveTextContent('Edit User');
    expect(screen.getByText('Leave empty to keep the current password.')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('Name'));
    await userEvent.type(screen.getByLabelText('Name'), 'Jane Smith');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(api.updateUser).toHaveBeenCalledWith('2', {
      name: 'Jane Smith', email: 'jane@library.com', role: 'member', password: '',
    });
    await expectNavigatedTo('/admin/users');
  });

  test('shows an error if the user to edit is not found', async () => {
    api.getUser.mockRejectedValue(new Error('User not found'));
    renderEdit();
    expect(await screen.findByRole('alert')).toHaveTextContent('User not found');
  });

  test('Cancel goes back to the user list', async () => {
    renderAdd();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await expectNavigatedTo('/admin/users');
  });
});
