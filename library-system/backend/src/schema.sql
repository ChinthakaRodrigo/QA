-- Library Management System - database schema (SQLite)

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin'))
);

CREATE TABLE IF NOT EXISTS books (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  title   TEXT    NOT NULL,
  author  TEXT    NOT NULL,
  isbn    TEXT    NOT NULL UNIQUE,
  year    INTEGER NOT NULL,
  copies  INTEGER NOT NULL CHECK (copies >= 1)
);

CREATE TABLE IF NOT EXISTS loans (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  borrowed_at TEXT    NOT NULL,
  due_at      TEXT    NOT NULL,
  returned_at TEXT,
  fine        INTEGER NOT NULL DEFAULT 0
);
