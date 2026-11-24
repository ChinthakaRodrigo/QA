// Starts the API server: node src/server.js
const path = require('node:path');
const { createDatabase, seedDatabase } = require('./db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 5000;
const DB_FILE = process.env.DB_FILE || path.join(__dirname, '..', 'library.db');

const db = createDatabase(DB_FILE);
seedDatabase(db);

createApp(db).listen(PORT, () => {
  console.log(`Library API running at http://localhost:${PORT}`);
});
