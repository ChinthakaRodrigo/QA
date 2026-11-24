import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import { api } from '../api';
import { renderPage, expectNavigatedTo } from '../test-utils';

vi.mock('../api', () => ({ api: { register: vi.fn() } }));

describe('LoginPage', () => {
  test('logs in and goes to the books page', async () => {
    const login = vi.fn().mockResolvedValue();
    renderPage(<LoginPage />, { route: '/login', path: '/login', login });

    await userEvent.type(screen.getByLabelText('Email'), 'jane@library.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Member123');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(login).toHaveBeenCalledWith('jane@library.com', 'Member123');
    await expectNavigatedTo('/');
  });

  test('shows the error when login fails', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Invalid email or password'));
    renderPage(<LoginPage />, { route: '/login', path: '/login', login });

    await userEvent.type(screen.getByLabelText('Email'), 'jane@library.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });
});

describe('RegisterPage', () => {
  async function fillAndSubmit() {
    await userEvent.type(screen.getByLabelText('Name'), 'Sam');
    await userEvent.type(screen.getByLabelText('Email'), 'sam@test.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Reader123');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
  }

  test('creates an account and goes to the login page', async () => {
    api.register.mockResolvedValue({ user: { id: 3 } });
    renderPage(<RegisterPage />, { route: '/register', path: '/register' });

    await fillAndSubmit();

    expect(api.register).toHaveBeenCalledWith({ name: 'Sam', email: 'sam@test.com', password: 'Reader123' });
    await expectNavigatedTo('/login');
  });

  test('shows validation errors from the server', async () => {
    const error = Object.assign(new Error('Validation failed'), { details: ['A valid email is required'] });
    api.register.mockRejectedValue(error);
    renderPage(<RegisterPage />, { route: '/register', path: '/register' });

    await fillAndSubmit();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Validation failed');
    expect(alert).toHaveTextContent('A valid email is required');
  });
});
