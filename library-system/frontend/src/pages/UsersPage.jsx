// Admin page: list, search and delete users.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../AuthContext';
import Message from '../components/Message';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState({ type: 'success', text: '' });

  async function loadUsers(searchText = '') {
    try {
      const data = await api.getUsers(searchText);
      setUsers(data.users);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleSearch(event) {
    event.preventDefault();
    loadUsers(search);
  }

  async function handleDelete(user) {
    if (!window.confirm(`Delete user "${user.name}"?`)) return;
    try {
      await api.deleteUser(user.id);
      setMessage({ type: 'success', text: `User "${user.name}" was deleted.` });
      loadUsers(search);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  return (
    <div>
      <div className="row space-between">
        <h2>Users</h2>
        <Link to="/admin/users/new" className="button">Add User</Link>
      </div>

      <form className="search" onSubmit={handleSearch}>
        <input
          aria-label="Search users"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit">Search</button>
      </form>

      <Message type={message.type} text={message.text} />

      {users.length === 0 ? (
        <p>No users found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Books on loan</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} data-testid={`user-row-${user.id}`}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.active_loans}</td>
                <td className="actions">
                  <Link to={`/admin/users/${user.id}/edit`} className="button secondary">Edit</Link>
                  {user.id !== currentUser?.id && (
                    <button type="button" className="danger" onClick={() => handleDelete(user)}>Delete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
