const path = require('path');

module.exports = function(config) {
  config.set({
    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-mocha',
      'karma-chai',
      'karma-spec-reporter',
      'karma-sourcemap-loader',
      'karma-fixture',
      'karma-html2js-preprocessor',
      'karma-sauce-launcher',
    ],
    // Change this to 'Chrome' if you would like to debug.
    // Can also add additional local browsers like 'Firefox'.
    browsers: ['ChromeHeadless'],
    // Set this to false to leave the browser open for debugging.
    // You'll probably also need to remove the afterEach block in your tests
    // so the content is not removed from the page you're trying to debug.
    // To isolate a test, use `it.only`.
    // https://mochajs.org/#exclusive-tests
    singleRun: true,
    // Use the mocha test framework with chai assertions.
    frameworks: ['mocha', 'chai', 'fixture'],
    preprocessors: {
      '**/*.html': ['html2js'],
    },
    // The root path location that will be used to resolve all relative paths
    // defined in files and exclude.
    basePath: path.resolve(__dirname),
    // Things in the files array will be injected into the page.
    files: [
      'dist/inert.js',
      'test/fixtures/**/*',
      'test/specs/helpers/**/*',
      'test/specs/**/*.spec.js',
    ],
    // Report output to console.
    reporters: ['spec'],
  });

  // If we're on Travis, override config settings and run tests on SauceLabs.
  if (process.env.TRAVIS) {
    const customLaunchers = {
      sl_chrome: {
        base: 'SauceLabs',
        browserName: 'chrome',
        platform: 'macOS 10.13',
        version: '66.0',
      },
    };

    config.set({
      sauceLabs: {
        testName: 'Inert Polyfill Tests',
        username: 'robdodson_inert',
        accessKey: 'a844aee9-d3ec-4566-94e3-dba3d0c30248',
      },
      // Increase timeout in case connection in CI is slow
      captureTimeout: 120000,
      customLaunchers: customLaunchers,
      browsers: Object.keys(customLaunchers),
      reporters: ['spec', 'saucelabs'],
    });
  }
};
