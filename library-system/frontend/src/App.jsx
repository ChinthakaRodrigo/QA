import { Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import BooksPage from './pages/BooksPage';
import BookFormPage from './pages/BookFormPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MyLoansPage from './pages/MyLoansPage';
import AllLoansPage from './pages/AllLoansPage';

export default function App() {
  return (
    <>
      <NavBar />
      <main className="container">
        <Routes>
          <Route path="/" element={<BooksPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/my-loans" element={<ProtectedRoute><MyLoansPage /></ProtectedRoute>} />
          <Route path="/books/new" element={<ProtectedRoute adminOnly><BookFormPage /></ProtectedRoute>} />
          <Route path="/books/:id/edit" element={<ProtectedRoute adminOnly><BookFormPage /></ProtectedRoute>} />
          <Route path="/admin/loans" element={<ProtectedRoute adminOnly><AllLoansPage /></ProtectedRoute>} />
          <Route path="*" element={<h2>Page not found</h2>} />
        </Routes>
      </main>
    </>
  );
}
