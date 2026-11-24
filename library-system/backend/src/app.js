// Builds the Express app. Kept separate from server.js so tests can use it without starting a server.
const express = require('express');
const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const loanRoutes = require('./routes/loans');
const userRoutes = require('./routes/users');

// db  - an open SQLite database (see db.js)
// now - function returning the current time (tests pass a fake clock to test overdue books)
function createApp(db, { now = () => new Date() } = {}) {
  const app = express();
  app.use(express.json());

  app.locals.db = db;
  app.locals.now = now;

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes);
  app.use('/api/books', bookRoutes);
  app.use('/api/loans', loanRoutes);
  app.use('/api/users', userRoutes);

  // Unknown API route
  app.use('/api', (req, res) => res.status(404).json({ error: 'Route not found' }));

  // Error handler (bad JSON body or unexpected errors)
  // eslint-disable-next-line no-unused-vars -- Express needs all 4 arguments to treat this as an error handler
  app.use((err, req, res, _next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body is not valid JSON' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}

module.exports = { createApp };
