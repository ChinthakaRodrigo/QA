// One form used for both "Add Book" (/books/new) and "Edit Book" (/books/:id/edit).
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import Message from '../components/Message';

const EMPTY_BOOK = { title: '', author: '', isbn: '', year: '', copies: '1' };

export default function BookFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_BOOK);
  const [error, setError] = useState(null);

  // When editing, load the existing book into the form.
  useEffect(() => {
    if (!isEdit) return;
    api
      .getBook(id)
      .then(({ book }) =>
        setForm({ ...book, year: String(book.year), copies: String(book.copies) })
      )
      .catch((err) => setError(err));
  }, [id, isEdit]);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    const book = {
      title: form.title,
      author: form.author,
      isbn: form.isbn,
      year: Number(form.year),
      copies: Number(form.copies),
    };
    try {
      if (isEdit) await api.updateBook(id, book);
      else await api.createBook(book);
      navigate('/');
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div className="card narrow">
      <h2>{isEdit ? 'Edit Book' : 'Add Book'}</h2>
      <Message text={error?.message} details={error?.details} />
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="title">Title</label>
        <input id="title" name="title" value={form.title} onChange={handleChange} />

        <label htmlFor="author">Author</label>
        <input id="author" name="author" value={form.author} onChange={handleChange} />

        <label htmlFor="isbn">ISBN</label>
        <input id="isbn" name="isbn" value={form.isbn} onChange={handleChange} placeholder="10 or 13 digits" />

        <label htmlFor="year">Year</label>
        <input id="year" name="year" type="number" value={form.year} onChange={handleChange} />

        <label htmlFor="copies">Copies</label>
        <input id="copies" name="copies" type="number" value={form.copies} onChange={handleChange} />

        <div className="row">
          <button type="submit">{isEdit ? 'Save changes' : 'Add book'}</button>
          <button type="button" className="secondary" onClick={() => navigate('/')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
