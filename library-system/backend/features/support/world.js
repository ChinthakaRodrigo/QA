// Cucumber "World": fresh state for every scenario.
// Reuses the Jest test helpers, so each scenario gets its own in-memory database and fake clock.
const { setWorldConstructor, World } = require('@cucumber/cucumber');
const request = require('supertest');
const { createTestApp } = require('../../tests/helpers');

class LibraryWorld extends World {
  constructor(options) {
    super(options);
    const { app, clock } = createTestApp();
    this.app = app;
    this.clock = clock;
    this.token = null;
    this.response = null; // last API response
    this.loansByTitle = {}; // loan created for each book title
  }

  api(method, url) {
    const req = request(this.app)[method](url);
    return this.token ? req.set('Authorization', `Bearer ${this.token}`) : req;
  }

  async findBook(title) {
    const res = await this.api('get', `/api/books?search=${encodeURIComponent(title)}`);
    const book = res.body.books.find((b) => b.title === title);
    if (!book) throw new Error(`Book "${title}" is not in the catalogue`);
    return book;
  }

  async borrow(title) {
    const book = await this.findBook(title);
    this.response = await this.api('post', '/api/loans').send({ bookId: book.id });
    if (this.response.status === 201) this.loansByTitle[title] = this.response.body.loan;
    return this.response;
  }
}

setWorldConstructor(LibraryWorld);
