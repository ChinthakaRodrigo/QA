import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Message from '../components/Message';

export default function BooksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState({ type: 'success', text: '' });

  async function loadBooks(searchText = '') {
    try {
      const data = await api.getBooks(searchText);
      setBooks(data.books);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  useEffect(() => {
    loadBooks();
  }, []);

  function handleSearch(event) {
    event.preventDefault();
    loadBooks(search);
  }

  async function handleBorrow(book) {
    try {
      await api.borrowBook(book.id);
      setMessage({ type: 'success', text: `You borrowed "${book.title}". Return it within 14 days.` });
      loadBooks(search);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function handleDelete(book) {
    if (!window.confirm(`Delete "${book.title}"?`)) return;
    try {
      await api.deleteBook(book.id);
      setMessage({ type: 'success', text: `"${book.title}" was deleted.` });
      loadBooks(search);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  return (
    <div>
      <h2>Books</h2>

      <form className="search" onSubmit={handleSearch}>
        <input
          aria-label="Search books"
          placeholder="Search by title, author or ISBN"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      <Message type={message.type} text={message.text} />

      {books.length === 0 ? (
        <p>No books found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>ISBN</th>
              <th>Year</th>
              <th>Available</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {books.map((book) => (
              <tr key={book.id} data-testid={`book-row-${book.id}`}>
                <td>{book.title}</td>
                <td>{book.author}</td>
                <td>{book.isbn}</td>
                <td>{book.year}</td>
                <td>{book.available} / {book.copies}</td>
                <td className="actions">
                  {user && (
                    <button type="button" onClick={() => handleBorrow(book)} disabled={book.available === 0}>
                      Borrow
                    </button>
                  )}
                  {isAdmin && <Link to={`/books/${book.id}/edit`} className="button secondary">Edit</Link>}
                  {isAdmin && (
                    <button type="button" className="danger" onClick={() => handleDelete(book)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!user && <p><Link to="/login">Log in</Link> to borrow books.</p>}
    </div>
  );
}
