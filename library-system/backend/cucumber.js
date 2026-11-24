// Cucumber (BDD) settings - run with "npm run test:bdd"
module.exports = {
  default: {
    paths: ['features/**/*.feature'],
    require: ['features/support/**/*.js', 'features/step_definitions/**/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    strict: true, // undefined or pending steps fail the run
  },
};
