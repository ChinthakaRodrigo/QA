// Shared Selenium helpers: browser setup, page actions, waits and screenshots.
// The app must already be running (frontend on BASE_URL, backend behind its /api proxy).
const fs = require('node:fs');
const path = require('node:path');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const HEADLESS = process.env.HEADLESS !== 'false'; // HEADLESS=false shows the browser window
const TIMEOUT = 10_000;
const SCREENSHOT_DIR = path.join(__dirname, '..', 'screenshots');

const ADMIN = { email: 'admin@library.com', password: 'Admin123' };
const MEMBER = { email: 'jane@library.com', password: 'Member123', name: 'Jane Member' };

async function startBrowser() {
  const options = new chrome.Options().addArguments('--window-size=1280,900', '--no-sandbox', '--disable-dev-shm-usage');
  if (HEADLESS) options.addArguments('--headless=new');
  // Selenium Manager (built into selenium-webdriver) downloads the matching chromedriver.
  return new Builder().forBrowser('chrome').setChromeOptions(options).build();
}

// Opens a page of the app, e.g. open(driver, '/login').
async function open(driver, route = '/') {
  await driver.get(BASE_URL + route);
}

// Logs out by removing the saved token, so every test starts as a guest.
async function resetSession(driver) {
  await open(driver, '/');
  await driver.executeScript('window.localStorage.clear();');
  await driver.navigate().refresh();
}

async function login(driver, { email, password }) {
  await open(driver, '/login');
  await driver.wait(until.elementLocated(By.id('email')), TIMEOUT);
  await driver.findElement(By.id('email')).sendKeys(email);
  await driver.findElement(By.id('password')).sendKeys(password);
  await driver.findElement(By.css('form button[type="submit"]')).click();
}

// Waits until an element is visible and returns it.
async function waitFor(driver, locator) {
  const element = await driver.wait(until.elementLocated(locator), TIMEOUT);
  await driver.wait(until.elementIsVisible(element), TIMEOUT);
  return element;
}

// Waits until the element's text contains `text`, then returns the full text.
async function waitForText(driver, locator, text) {
  const element = await waitFor(driver, locator);
  await driver.wait(until.elementTextContains(element, text), TIMEOUT);
  return element.getText();
}

// The <tr> of a table whose first cell is exactly `firstCell` (a book title).
function rowFor(firstCell) {
  return By.xpath(`//tbody/tr[td[1][normalize-space()="${firstCell}"]]`);
}

async function screenshot(driver, name) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const file = path.join(SCREENSHOT_DIR, `${name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.png`);
  fs.writeFileSync(file, await driver.takeScreenshot(), 'base64');
}

module.exports = {
  By,
  until,
  TIMEOUT,
  ADMIN,
  MEMBER,
  startBrowser,
  open,
  resetSession,
  login,
  waitFor,
  waitForText,
  rowFor,
  screenshot,
};
