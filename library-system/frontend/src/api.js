// All calls to the backend go through this file.

const TOKEN_KEY = 'library_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

// Sends a request and returns the JSON response.
// On failure it throws an Error with .message (from the API), .details (list) and .status.
async function request(method, url, body) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${url}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(data.error || 'Something went wrong');
    error.details = data.details || [];
    error.status = res.status;
    throw error;
  }
  return data;
}

export const api = {
  login: (email, password) => request('POST', '/auth/login', { email, password }),
  register: (user) => request('POST', '/auth/register', user),
  me: () => request('GET', '/auth/me'),

  getBooks: (search = '') => request('GET', `/books?search=${encodeURIComponent(search)}`),
  getBook: (id) => request('GET', `/books/${id}`),
  createBook: (book) => request('POST', '/books', book),
  updateBook: (id, book) => request('PUT', `/books/${id}`, book),
  deleteBook: (id) => request('DELETE', `/books/${id}`),

  borrowBook: (bookId) => request('POST', '/loans', { bookId }),
  returnLoan: (loanId) => request('POST', `/loans/${loanId}/return`),
  getMyLoans: () => request('GET', '/loans/my'),
  getAllLoans: () => request('GET', '/loans'),
};
