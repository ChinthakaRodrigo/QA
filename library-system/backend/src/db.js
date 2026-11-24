// Opens the SQLite database, creates the tables and adds some starter data.
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { hashPassword } = require('./utils/password');

function createDatabase(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  return db;
}

// Adds demo users and books, but only when the database is empty.
function seedDatabase(db) {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (count > 0) return;

  const addUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  );
  addUser.run('Admin User', 'admin@library.com', hashPassword('Admin123'), 'admin');
  addUser.run('Jane Member', 'jane@library.com', hashPassword('Member123'), 'member');

  const addBook = db.prepare(
    'INSERT INTO books (title, author, isbn, year, copies) VALUES (?, ?, ?, ?, ?)'
  );
  addBook.run('Clean Code', 'Robert C. Martin', '9780132350884', 2008, 3);
  addBook.run('The Pragmatic Programmer', 'Andrew Hunt', '9780135957059', 2019, 2);
  addBook.run('Design Patterns', 'Erich Gamma', '9780201633610', 1994, 1);
  addBook.run('Refactoring', 'Martin Fowler', '9780134757599', 2018, 2);
  addBook.run('Domain-Driven Design', 'Eric Evans', '9780321125217', 2003, 1);
}

module.exports = { createDatabase, seedDatabase };
