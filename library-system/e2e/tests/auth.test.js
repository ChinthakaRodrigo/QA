// UI-AUTH: login, logout, registration and access control (README user flows 1, 3, 4, 15).
const { describe, test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const {
  By, until, TIMEOUT, ADMIN, MEMBER, startBrowser, open, resetSession, login, waitFor, waitForText, screenshot,
} = require('../support/driver');

describe('Authentication and access control', () => {
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

  test('UI-01 member logs in, sees their name in the nav bar, then logs out', async () => {
    await login(driver, MEMBER);
    const greeting = await waitForText(driver, By.css('[data-testid="current-user"]'), MEMBER.name);
    assert.equal(greeting, `Hi, ${MEMBER.name} (member)`);

    await driver.findElement(By.xpath('//nav//button[normalize-space()="Logout"]')).click();
    await driver.wait(until.urlContains('/login'), TIMEOUT);
    assert.equal((await driver.findElements(By.css('[data-testid="current-user"]'))).length, 0);
  });

  test('UI-02 login with a wrong password shows an error', async () => {
    await login(driver, { email: MEMBER.email, password: 'WrongPass1' });
    const error = await waitForText(driver, By.css('[role="alert"]'), 'Invalid');
    assert.equal(error, 'Invalid email or password');
    assert.match(await driver.getCurrentUrl(), /\/login$/);
  });

  test('UI-03 guest registers a new account and is sent to login with a success message', async () => {
    await open(driver, '/register');
    await waitFor(driver, By.id('name'));
    await driver.findElement(By.id('name')).sendKeys('Selenium Tester');
    await driver.findElement(By.id('email')).sendKeys(`selenium.${Date.now()}@example.com`);
    await driver.findElement(By.id('password')).sendKeys('Selenium123');
    await driver.findElement(By.css('form button[type="submit"]')).click();

    await driver.wait(until.urlContains('/login'), TIMEOUT);
    const message = await waitForText(driver, By.css('[role="status"]'), 'Account created');
    assert.equal(message, 'Account created. You can now log in.');
  });

  test('UI-04 guest opening My Loans is redirected to the login page', async () => {
    await open(driver, '/my-loans');
    await driver.wait(until.urlContains('/login'), TIMEOUT);
    await waitFor(driver, By.id('email'));
  });

  test('UI-05 member cannot open the admin Users page, but an admin can', async () => {
    await login(driver, MEMBER);
    await waitFor(driver, By.css('[data-testid="current-user"]'));
    await open(driver, '/admin/users');
    await waitForText(driver, By.css('main .error'), 'Only admins can see this page.');

    await resetSession(driver);
    await login(driver, ADMIN);
    await waitFor(driver, By.css('[data-testid="current-user"]'));
    await open(driver, '/admin/users');
    await waitForText(driver, By.css('main h2'), 'Users');
  });
});
