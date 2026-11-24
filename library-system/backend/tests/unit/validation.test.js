const { validateRegistration, validateUser, validateBook, normalizeIsbn, parseId } = require('../../src/utils/validation');

describe('validateUser (admin creates / edits a user)', () => {
  const valid = { name: 'Tom', email: 'tom@test.com', password: 'Secret123', role: 'member' };

  test('accepts a valid new user', () => {
    expect(validateUser(valid)).toEqual([]);
  });

  test.each(['admin', 'member'])('accepts role "%s"', (role) => {
    expect(validateUser({ ...valid, role })).toEqual([]);
  });

  test.each(['Admin', 'librarian', '', undefined])('rejects role %p', (role) => {
    expect(validateUser({ ...valid, role })).toEqual(['Role must be member or admin']);
  });

  test('requires a password for a new user', () => {
    expect(validateUser({ ...valid, password: undefined })).toEqual(['Password must be at least 8 characters']);
  });

  test.each([undefined, ''])('password %p may be left out when editing', (password) => {
    expect(validateUser({ ...valid, password }, { isNew: false })).toEqual([]);
  });

  test('a new password given when editing must still be strong', () => {
    expect(validateUser({ ...valid, password: 'abcdefgh' }, { isNew: false })).toEqual([
      'Password must contain at least one letter and one number',
    ]);
  });

  test('reports every problem for an empty body', () => {
    expect(validateUser()).toHaveLength(4);
  });
});

describe('validateRegistration', () => {
  const valid = { name: 'John', email: 'john@test.com', password: 'Secret123' };

  test('accepts valid input', () => {
    expect(validateRegistration(valid)).toEqual([]);
  });

  test('reports all missing fields when body is empty', () => {
    expect(validateRegistration()).toEqual([
      'Name is required',
      'A valid email is required',
      'Password must be at least 8 characters',
    ]);
  });

  test('rejects a name longer than 50 characters', () => {
    expect(validateRegistration({ ...valid, name: 'a'.repeat(51) })).toEqual(['Name must be 50 characters or less']);
  });

  test('accepts a name of exactly 50 characters (boundary)', () => {
    expect(validateRegistration({ ...valid, name: 'a'.repeat(50) })).toEqual([]);
  });

  test.each(['plainaddress', 'no@domain', '@test.com', 'a b@test.com'])('rejects invalid email "%s"', (email) => {
    expect(validateRegistration({ ...valid, email })).toContain('A valid email is required');
  });

  test('rejects a 7 character password (boundary)', () => {
    expect(validateRegistration({ ...valid, password: 'Abc1234' })).toEqual(['Password must be at least 8 characters']);
  });

  test.each(['abcdefgh', '12345678'])('rejects password "%s" without both letters and numbers', (password) => {
    expect(validateRegistration({ ...valid, password })).toEqual([
      'Password must contain at least one letter and one number',
    ]);
  });
});

describe('validateBook', () => {
  const valid = { title: 'Book', author: 'Author', isbn: '9780132350884', year: 2008, copies: 1 };

  test('accepts a valid book', () => {
    expect(validateBook(valid, 2026)).toEqual([]);
  });

  test('reports every problem with an empty book', () => {
    expect(validateBook(undefined, 2026)).toHaveLength(5);
  });

  test('rejects whitespace-only title and author', () => {
    expect(validateBook({ ...valid, title: '   ', author: '  ' }, 2026)).toEqual([
      'Title is required',
      'Author is required',
    ]);
  });

  test('rejects too long title and author', () => {
    expect(validateBook({ ...valid, title: 'x'.repeat(201), author: 'y'.repeat(101) }, 2026)).toEqual([
      'Title must be 200 characters or less',
      'Author must be 100 characters or less',
    ]);
  });

  test.each(['0306406152', '978-0-13-235088-4'])('accepts ISBN "%s"', (isbn) => {
    expect(validateBook({ ...valid, isbn }, 2026)).toEqual([]);
  });

  test.each(['12345', '97801323508841', 'ABCDEFGHIJ', ''])('rejects ISBN "%s"', (isbn) => {
    expect(validateBook({ ...valid, isbn }, 2026)).toEqual(['ISBN must be 10 or 13 digits']);
  });

  test.each([
    [1449, false],
    [1450, true],
    [2026, true],
    [2027, false],
    [2000.5, false],
  ])('year %p valid = %p', (year, isValid) => {
    expect(validateBook({ ...valid, year }, 2026).length === 0).toBe(isValid);
  });

  test.each([
    [0, false],
    [1, true],
    [50, true],
    [51, false],
    ['3', false],
  ])('copies %p valid = %p', (copies, isValid) => {
    expect(validateBook({ ...valid, copies }, 2026).length === 0).toBe(isValid);
  });
});

describe('normalizeIsbn', () => {
  test('removes dashes and spaces', () => {
    expect(normalizeIsbn('978-0 13-235088-4')).toBe('9780132350884');
  });

  test('handles null', () => {
    expect(normalizeIsbn(null)).toBe('');
  });
});

describe('parseId', () => {
  test.each([
    ['5', 5],
    [7, 7],
    ['0', null],
    ['-1', null],
    ['abc', null],
    ['1.5', null],
    [undefined, null],
  ])('parseId(%p) -> %p', (input, expected) => {
    expect(parseId(input)).toBe(expected);
  });
});
