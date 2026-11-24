import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Shows the page only to logged-in users (and only to admins when adminOnly is set).
export default function ProtectedRoute({ adminOnly = false, children }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <p className="error">Only admins can see this page.</p>;
  return children;
}
