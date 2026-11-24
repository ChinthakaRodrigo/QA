import { api, getToken, setToken } from '../api';

function mockFetch(status, body) {
  globalThis.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new Error('no body')) : Promise.resolve(body)),
  });
}

beforeEach(() => localStorage.clear());

describe('api helper', () => {
  test('sends JSON and returns the response data', async () => {
    mockFetch(200, { token: 'abc', user: { id: 1 } });
    const data = await api.login('a@b.com', 'Secret123');

    expect(data.token).toBe('abc');
    expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a@b.com', password: 'Secret123' }),
    });
  });

  test('adds the saved token to requests', async () => {
    setToken('my-token');
    mockFetch(200, { loans: [] });
    await api.getMyLoans();
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer my-token');
  });

  test('encodes the search text', async () => {
    mockFetch(200, { books: [] });
    await api.getBooks('a&b');
    expect(fetch.mock.calls[0][0]).toBe('/api/books?search=a%26b');
  });

  test('throws an error with the API message and details', async () => {
    mockFetch(400, { error: 'Validation failed', details: ['Title is required'] });
    await expect(api.createBook({})).rejects.toMatchObject({
      message: 'Validation failed',
      details: ['Title is required'],
      status: 400,
    });
  });

  test('uses a default message when the response has no body', async () => {
    mockFetch(500, undefined);
    await expect(api.getAllLoans()).rejects.toThrow('Something went wrong');
  });

  test('returns null for 204 No Content', async () => {
    mockFetch(204, undefined);
    expect(await api.deleteBook(1)).toBeNull();
  });

  test('setToken(null) removes the token', () => {
    setToken('x');
    setToken(null);
    expect(getToken()).toBeNull();
  });
});
