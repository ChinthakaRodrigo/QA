// White-box tests: src/utils/validation.js (docs/04-white-box-testing.md)
// "STMT" marks a set that is enough for 100 % statement coverage; the other tests
// make every single condition of the compound decisions both true and false.
const { validateRegistration, validateUser, validateBook, normalizeIsbn, parseId } = require('../../src/utils/validation');

const NAME_REQUIRED = 'Name is required';
const NAME_LONG = 'Name must be 50 characters or less';
const EMAIL = 'A valid email is required';
const PASSWORD_SHORT = 'Password must be at least 8 characters';
const PASSWORD_MIX = 'Password must contain at least one letter and one number';
const ROLE = 'Role must be member or admin';
const TITLE_REQUIRED = 'Title is required';
const TITLE_LONG = 'Title must be 200 characters or less';
const AUTHOR_REQUIRED = 'Author is required';
const AUTHOR_LONG = 'Author must be 100 characters or less';
const ISBN = 'ISBN must be 10 or 13 digits';
const YEAR = 'Year must be a whole number between 1450 and 2026';
const COPIES = 'Copies must be a whole number between 1 and 50';

const person = { name: 'Sam', email: 'sam@test.com', password: 'Reader123' };
const user = { ...person, role: 'member' };
const book = { title: 'Book', author: 'Author', isbn: '9780132350884', year: 2008, copies: 1 };

describe('isBlank, checkName, checkEmail, checkPassword (through validateRegistration)', () => {
  test.each([
    ['WB-24 STMT default argument: nothing given', undefined, [NAME_REQUIRED, EMAIL, PASSWORD_SHORT]],
    ['WB-25 STMT name too long, password without a digit', { ...person, name: 'n'.repeat(51), password: 'abcdefgh' }, [NAME_LONG, PASSWORD_MIX]],
    ['WB-26 all decisions false', person, []],
    ['WB-27 isBlank: text, but only spaces', { ...person, name: '   ' }, [NAME_REQUIRED]],
    ['WB-28 checkEmail: not blank, wrong pattern', { ...person, email: 'sam' }, [EMAIL]],
    ['WB-29 checkPassword: text, but short', { ...person, password: 'abc1' }, [PASSWORD_SHORT]],
    ['WB-30 checkPassword: without a letter', { ...person, password: '12345678' }, [PASSWORD_MIX]],
  ])('%s', (_name, input, errors) => {
    expect(validateRegistration(input)).toEqual(errors);
  });
});

describe('validateUser, V(G) = 8', () => {
  test.each([
    ['WB-31 STMT default arguments: nothing given', [], [NAME_REQUIRED, EMAIL, ROLE, PASSWORD_SHORT]],
    ['WB-32 isNew true: password is checked', [{ ...user, password: '' }, { isNew: true }], [PASSWORD_SHORT]],
    ['WB-33 isNew false, password undefined: not checked', [{ ...user, password: undefined }, { isNew: false }], []],
    ['WB-34 isNew false, password empty: not checked', [{ ...user, password: '' }, { isNew: false }], []],
    ['WB-35 isNew false, password given: checked', [{ ...user, password: 'abc1' }, { isNew: false }], [PASSWORD_SHORT]],
    ['WB-36 options without isNew: treated as new', [{ ...user, password: '' }, {}], [PASSWORD_SHORT]],
    ['WB-37 all fields valid', [user], []],
  ])('%s', (_name, args, errors) => {
    expect(validateUser(...args)).toEqual(errors);
  });
});

describe('validateBook, V(G) = 14', () => {
  test.each([
    ['WB-38 STMT default book: every field wrong', undefined, [TITLE_REQUIRED, AUTHOR_REQUIRED, ISBN, YEAR, COPIES]],
    ['WB-39 STMT title and author too long', { ...book, title: 't'.repeat(201), author: 'a'.repeat(101) }, [TITLE_LONG, AUTHOR_LONG]],
    ['WB-40 all decisions false', book, []],
    ['WB-41 title blank only', { ...book, title: '' }, [TITLE_REQUIRED]],
    ['WB-42 title too long only', { ...book, title: 't'.repeat(201) }, [TITLE_LONG]],
    ['WB-43 author blank only', { ...book, author: '' }, [AUTHOR_REQUIRED]],
    ['WB-44 author too long only', { ...book, author: 'a'.repeat(101) }, [AUTHOR_LONG]],
    ['WB-45 ISBN wrong only', { ...book, isbn: '123' }, [ISBN]],
    ['WB-46 year: not a whole number', { ...book, year: 2000.5 }, [YEAR]],
    ['WB-47 year: whole number, too small', { ...book, year: 1449 }, [YEAR]],
    ['WB-48 year: whole number, too large', { ...book, year: 2027 }, [YEAR]],
    ['WB-49 copies: not a whole number', { ...book, copies: 1.5 }, [COPIES]],
    ['WB-50 copies: whole number, too small', { ...book, copies: 0 }, [COPIES]],
    ['WB-51 copies: whole number, too large', { ...book, copies: 51 }, [COPIES]],
  ])('%s', (_name, input, errors) => {
    expect(validateBook(input, 2026)).toEqual(errors);
  });

  test('WB-52 default current year: this year is accepted, next year is not', () => {
    const thisYear = new Date().getFullYear();
    expect(validateBook({ ...book, year: thisYear })).toEqual([]);
    expect(validateBook({ ...book, year: thisYear + 1 })).toHaveLength(1);
  });
});

describe('normalizeIsbn, V(G) = 2', () => {
  test('WB-53 value given', () => {
    expect(normalizeIsbn('978-0 132350884')).toBe('9780132350884');
  });

  test('WB-54 value missing', () => {
    expect(normalizeIsbn(undefined)).toBe('');
  });
});

describe('parseId, V(G) = 3', () => {
  test.each([
    ['WB-55 STMT whole number above 0', '5', 5],
    ['WB-56 not a whole number', 'abc', null],
    ['WB-57 whole number, not above 0', '0', null],
  ])('%s', (_name, input, expected) => {
    expect(parseId(input)).toBe(expected);
  });
});
