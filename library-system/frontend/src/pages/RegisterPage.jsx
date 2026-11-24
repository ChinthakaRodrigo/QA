import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import Message from '../components/Message';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    try {
      await api.register(form);
      navigate('/login', { state: { message: 'Account created. You can now log in.' } });
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div className="card narrow">
      <h2>Register</h2>
      <Message text={error?.message} details={error?.details} />
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" value={form.name} onChange={handleChange} />

        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" value={form.email} onChange={handleChange} />

        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" value={form.password} onChange={handleChange} />
        <small>At least 8 characters, with a letter and a number.</small>

        <button type="submit">Create account</button>
      </form>
      <p>Already registered? <Link to="/login">Login</Link></p>
    </div>
  );
}
