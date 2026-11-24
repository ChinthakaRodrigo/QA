import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function NavBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to="/" className="brand">📚 Library</Link>
      <Link to="/">Books</Link>
      {user && <Link to="/my-loans">My Loans</Link>}
      {user?.role === 'admin' && <Link to="/books/new">Add Book</Link>}
      {user?.role === 'admin' && <Link to="/admin/loans">All Loans</Link>}

      <span className="spacer" />
      {user ? (
        <>
          <span data-testid="current-user">Hi, {user.name} ({user.role})</span>
          <button type="button" onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </>
      )}
    </nav>
  );
}
