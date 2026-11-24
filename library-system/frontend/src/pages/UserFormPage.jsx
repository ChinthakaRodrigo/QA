// One form used for both "Add User" (/admin/users/new) and "Edit User" (/admin/users/:id/edit).
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import Message from '../components/Message';

const EMPTY_USER = { name: '', email: '', password: '', role: 'member' };

export default function UserFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_USER);
  const [error, setError] = useState(null);

  // When editing, load the existing user into the form (the password stays empty).
  useEffect(() => {
    if (!isEdit) return;
    api
      .getUser(id)
      .then(({ user }) => setForm({ name: user.name, email: user.email, role: user.role, password: '' }))
      .catch((err) => setError(err));
  }, [id, isEdit]);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      if (isEdit) await api.updateUser(id, form);
      else await api.createUser(form);
      navigate('/admin/users');
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div className="card narrow">
      <h2>{isEdit ? 'Edit User' : 'Add User'}</h2>
      <Message text={error?.message} details={error?.details} />
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" value={form.name} onChange={handleChange} />

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" value={form.password} onChange={handleChange} />
        <small>
          {isEdit ? 'Leave empty to keep the current password.' : 'At least 8 characters, with a letter and a number.'}
        </small>

        <label htmlFor="role">Role</label>
        <select id="role" name="role" value={form.role} onChange={handleChange}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>

        <div className="row">
          <button type="submit">{isEdit ? 'Save changes' : 'Add user'}</button>
          <button type="button" className="secondary" onClick={() => navigate('/admin/users')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
