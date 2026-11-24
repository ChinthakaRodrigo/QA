// Input validation. Each validate function returns a list of error messages (empty list = valid).

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISBN_PATTERN = /^(\d{10}|\d{13})$/;

function isBlank(value) {
  return typeof value !== 'string' || value.trim() === '';
}

function validateRegistration({ name, email, password } = {}) {
  const errors = [];
  if (isBlank(name)) errors.push('Name is required');
  else if (name.trim().length > 50) errors.push('Name must be 50 characters or less');

  if (isBlank(email) || !EMAIL_PATTERN.test(email.trim())) errors.push('A valid email is required');

  if (typeof password !== 'string' || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.push('Password must contain at least one letter and one number');
  }
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
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

module.exports = { validateRegistration, validateBook, normalizeIsbn, parseId };
