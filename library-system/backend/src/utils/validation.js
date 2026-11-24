// Input validation. Each validate function returns a list of error messages (empty list = valid).

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISBN_PATTERN = /^(\d{10}|\d{13})$/;

function isBlank(value) {
  return typeof value !== 'string' || value.trim() === '';
}

const ROLES = ['member', 'admin'];

function checkName(name, errors) {
  if (isBlank(name)) errors.push('Name is required');
  else if (name.trim().length > 50) errors.push('Name must be 50 characters or less');
}

function checkEmail(email, errors) {
  if (isBlank(email) || !EMAIL_PATTERN.test(email.trim())) errors.push('A valid email is required');
}

function checkPassword(password, errors) {
  if (typeof password !== 'string' || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.push('Password must contain at least one letter and one number');
  }
}

// Used when someone signs up themselves.
function validateRegistration({ name, email, password } = {}) {
  const errors = [];
  checkName(name, errors);
  checkEmail(email, errors);
  checkPassword(password, errors);
  return errors;
}

// Used when an admin creates or edits a user.
// When editing (isNew = false) the password may be left empty to keep the old one.
function validateUser({ name, email, password, role } = {}, { isNew = true } = {}) {
  const errors = [];
  checkName(name, errors);
  checkEmail(email, errors);
  if (!ROLES.includes(role)) errors.push('Role must be member or admin');
  if (isNew || (password !== undefined && password !== '')) checkPassword(password, errors);
  return errors;
}

// Removes dashes and spaces, e.g. "978-0-13-235088-4" -> "9780132350884"
function normalizeIsbn(isbn) {
  return String(isbn ?? '').replace(/[-\s]/g, '');
}

function validateBook({ title, author, isbn, year, copies } = {}, currentYear = new Date().getFullYear()) {
  const errors = [];
  if (isBlank(title)) errors.push('Title is required');
  else if (title.trim().length > 200) errors.push('Title must be 200 characters or less');

  if (isBlank(author)) errors.push('Author is required');
  else if (author.trim().length > 100) errors.push('Author must be 100 characters or less');

  if (!ISBN_PATTERN.test(normalizeIsbn(isbn))) errors.push('ISBN must be 10 or 13 digits');

  if (!Number.isInteger(year) || year < 1450 || year > currentYear) {
    errors.push(`Year must be a whole number between 1450 and ${currentYear}`);
  }
  if (!Number.isInteger(copies) || copies < 1 || copies > 50) {
    errors.push('Copies must be a whole number between 1 and 50');
  }
  return errors;
}

// Turns a URL id like "12" into the number 12. Returns null if it is not a positive whole number.
function parseId(value) {
  // IDs arrive as route strings or JSON numbers. Reject other JSON types before
  // coercion so values such as true and [2] cannot silently become valid IDs.
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

module.exports = { validateRegistration, validateUser, validateBook, normalizeIsbn, parseId };
