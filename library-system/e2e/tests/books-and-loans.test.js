// UI-BOOKS / UI-LOANS: browse, search, borrow and return (README user flows 5, 6, 9).
const { describe, test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  By, TIMEOUT, MEMBER, startBrowser, open, resetSession, login, waitFor, waitForText, rowFor, screenshot,
} = require('../support/driver');

const BOOK = 'Clean Code';

// Text of the "Available" column (5th cell) of a book row, e.g. "3 / 3".
async function availableCopies(driver, title) {
  const row = await waitFor(driver, rowFor(title));
  return row.findElement(By.css('td:nth-child(5)')).getText();
}

describe('Books and loans', () => {
  let driver;

  before(async () => {
    driver = await startBrowser();
  });
  after(async () => {
    await driver?.quit();
  });
  beforeEach(async () => {
    await resetSession(driver);
  });
  afterEach(async (t) => {
    await screenshot(driver, t.name);
  });

  test('UI-06 guest sees the book catalogue', async () => {
    await open(driver, '/');
    await waitFor(driver, rowFor(BOOK));
    const rows = await driver.findElements(By.css('tbody tr'));
    assert.equal(rows.length, 5, 'the demo data has 5 books');
    // Guests get a "Log in to borrow" hint instead of Borrow buttons.
    assert.equal((await driver.findElements(By.xpath('//button[normalize-space()="Borrow"]'))).length, 0);
  });

  test('UI-07 searching for fowler shows only Refactoring', async () => {
    await open(driver, '/');
    await waitFor(driver, rowFor(BOOK));
    await driver.findElement(By.css('input[aria-label="Search books"]')).sendKeys('fowler');
    await driver.findElement(By.xpath('//form[@class="search"]//button')).click();

    await driver.wait(async () => (await driver.findElements(By.css('tbody tr'))).length === 1, TIMEOUT);
    const titles = await Promise.all(
      (await driver.findElements(By.css('tbody tr td:first-child'))).map((cell) => cell.getText())
    );
    assert.deepEqual(titles, ['Refactoring']);
  });

  test('UI-08 member borrows a book and then returns it from My Loans', async () => {
    await login(driver, MEMBER);
    await waitFor(driver, By.css('[data-testid="current-user"]'));
    assert.equal(await availableCopies(driver, BOOK), '3 / 3');

    // Borrow
    const row = await driver.findElement(rowFor(BOOK));
    await row.findElement(By.xpath('.//button[normalize-space()="Borrow"]')).click();
    await waitForText(driver, By.css('[role="status"]'), `You borrowed "${BOOK}"`);
    await driver.wait(async () => (await availableCopies(driver, BOOK)) === '2 / 3', TIMEOUT);

    // The loan appears in My Loans as "borrowed"
    await driver.findElement(By.linkText('My Loans')).click();
    const loanRow = await waitFor(driver, rowFor(BOOK));
    assert.equal(await loanRow.findElement(By.css('.status')).getText(), 'borrowed');

    // Return it (on time, so no fine)
    await loanRow.findElement(By.xpath('.//button[normalize-space()="Return"]')).click();
    const message = await waitForText(driver, By.css('[role="status"]'), 'returned');
    assert.equal(message, `"${BOOK}" returned.`);
    await waitForText(driver, By.css(`tbody tr .status.returned`), 'returned');

    // The copy is available again
    await open(driver, '/');
    await driver.wait(async () => (await availableCopies(driver, BOOK)) === '3 / 3', TIMEOUT);
  });
});
