// Helper for component tests: renders a page with a fake logged-in user and a router.
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthContext } from './AuthContext';

// Shown when the page navigates somewhere else, so tests can check the new URL.
function CurrentLocation() {
  return <div data-testid="location">{useLocation().pathname}</div>;
}

export function renderPage(page, { user = null, route = '/', path = '/', login = vi.fn(), logout = vi.fn() } = {}) {
  const auth = { user, loading: false, login, logout };
  render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={page} />
          <Route path="*" element={<CurrentLocation />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
  return auth;
}

export async function expectNavigatedTo(pathname) {
  expect(await screen.findByTestId('location')).toHaveTextContent(pathname);
}

export const MEMBER = { id: 2, name: 'Jane Member', email: 'jane@library.com', role: 'member' };
export const ADMIN = { id: 1, name: 'Admin User', email: 'admin@library.com', role: 'admin' };
