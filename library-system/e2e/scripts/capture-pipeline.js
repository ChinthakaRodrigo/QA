// Saves screenshots of a GitHub Actions run page as CI evidence (task 6).
// Usage: node scripts/capture-pipeline.js <run URL>
//   e.g. node scripts/capture-pipeline.js https://github.com/<owner>/<repo>/actions/runs/123456789
// Works for public repositories (no login needed). Images are written to ../docs/images/.
const fs = require('node:fs');
const path = require('node:path');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const OUT_DIR = path.join(__dirname, '..', '..', 'docs', 'images');

async function main() {
  const runUrl = process.argv[2];
  if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/actions\/runs\/\d+/.test(runUrl || '')) {
    console.error('Usage: node scripts/capture-pipeline.js https://github.com/<owner>/<repo>/actions/runs/<id>');
    process.exit(1);
  }
  const actionsUrl = runUrl.replace(/\/runs\/\d+.*$/, '');

  const options = new chrome.Options().addArguments('--headless=new', '--window-size=1440,1800', '--hide-scrollbars');
  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  fs.mkdirSync(OUT_DIR, { recursive: true });

  async function capture(url, file) {
    await driver.get(url);
    await driver.wait(until.elementLocated(By.css('main')), 20_000);
    await driver.sleep(2_000); // let the page finish rendering
    fs.writeFileSync(path.join(OUT_DIR, file), await driver.takeScreenshot(), 'base64');
    console.log(`saved docs/images/${file}`);
  }

  try {
    await capture(actionsUrl, 'ci-01-workflow-runs.png'); // list of runs with green ticks
    await capture(runUrl, 'ci-02-run-summary.png'); // job graph, Selenium test table, artifacts
  } finally {
    await driver.quit();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
