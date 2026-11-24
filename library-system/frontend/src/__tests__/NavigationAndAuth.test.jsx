import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import NavBar from '../components/NavBar';
import ProtectedRoute from '../components/ProtectedRoute';
import App from '../App';
import { AuthContext, AuthProvider, useAuth } from '../AuthContext';
import { api, getToken, setToken } from '../api';
import { renderPage, expectNavigatedTo, MEMBER, ADMIN } from '../test-utils';

vi.mock('../api', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: { me: vi.fn(), login: vi.fn(), getBooks: vi.fn() } };
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  api.getBooks.mockResolvedValue({ books: [] });
});

describe('NavBar', () => {
  test('guest sees Login and Register links', () => {
    renderPage(<NavBar />);
    expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'My Loans' })).not.toBeInTheDocument();
  });

  test('member sees My Loans but not admin links', () => {
    renderPage(<NavBar />, { user: MEMBER });
    expect(screen.getByTestId('current-user')).toHaveTextContent('Hi, Jane Member (member)');
    expect(screen.getByRole('link', { name: 'My Loans' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Add Book' })).not.toBeInTheDocument();
  });

  test('admin sees admin links', () => {
    renderPage(<NavBar />, { user: ADMIN });
    expect(screen.getByRole('link', { name: 'Add Book' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All Loans' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
  });

  test('logout logs out and goes to the login page', async () => {
    const logout = vi.fn();
    renderPage(<NavBar />, { user: MEMBER, logout });
    await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(logout).toHaveBeenCalled();
    await expectNavigatedTo('/login');
  });
});

describe('ProtectedRoute', () => {
  const secret = <ProtectedRoute adminOnly><p>Secret page</p></ProtectedRoute>;

  test('redirects guests to login', async () => {
    renderPage(secret, { route: '/admin', path: '/admin' });
    await expectNavigatedTo('/login');
  });

  test('blocks members from admin pages', () => {
    renderPage(secret, { user: MEMBER });
    expect(screen.getByText('Only admins can see this page.')).toBeInTheDocument();
  });

  test('lets admins in', () => {
    renderPage(secret, { user: ADMIN });
    expect(screen.getByText('Secret page')).toBeInTheDocument();
  });

  test('shows loading while the user is being loaded', () => {
    render(
      <AuthContext.Provider value={{ user: null, loading: true }}>
        <MemoryRouter><ProtectedRoute><p>Page</p></ProtectedRoute></MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('AuthProvider', () => {
  function ShowUser() {
    const { user, login, logout } = useAuth();
    return (
      <div>
        <span data-testid="user">{user ? user.name : 'nobody'}</span>
        <button type="button" onClick={() => login('jane@library.com', 'Member123')}>do-login</button>
        <button type="button" onClick={logout}>do-logout</button>
      </div>
    );
  }

  test('login saves the token and the user; logout clears them', async () => {
    api.login.mockResolvedValue({ token: 'tok', user: MEMBER });
    render(<AuthProvider><ShowUser /></AuthProvider>);

    await userEvent.click(screen.getByText('do-login'));
    expect(screen.getByTestId('user')).toHaveTextContent('Jane Member');
    expect(getToken()).toBe('tok');

    await userEvent.click(screen.getByText('do-logout'));
    expect(screen.getByTestId('user')).toHaveTextContent('nobody');
    expect(getToken()).toBeNull();
  });

  test('restores the user from a saved token', async () => {
    setToken('saved');
    api.me.mockResolvedValue({ user: ADMIN });
    render(<AuthProvider><ShowUser /></AuthProvider>);
    expect(await screen.findByText('Admin User')).toBeInTheDocument();
  });

  test('removes an expired token', async () => {
    setToken('expired');
    api.me.mockRejectedValue(new Error('expired'));
    render(<AuthProvider><ShowUser /></AuthProvider>);
    await waitFor(() => expect(getToken()).toBeNull());
  });
});

describe('App routes', () => {
  test('unknown page shows "Page not found"', () => {
    render(
      <AuthContext.Provider value={{ user: null, loading: false }}>
        <MemoryRouter initialEntries={['/nope']}><App /></MemoryRouter>
      </AuthContext.Provider>
    );
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });

  test('home page shows the book list', async () => {
    render(
      <AuthContext.Provider value={{ user: null, loading: false }}>
        <MemoryRouter><App /></MemoryRouter>
      </AuthContext.Provider>
    );
    expect(await screen.findByRole('heading', { name: 'Books' })).toBeInTheDocument();
  });
});
