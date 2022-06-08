const path = require('path');

module.exports = function(config) {
  config.set({
    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-mocha',
      'karma-chai',
      'karma-polyfill',
      'karma-spec-reporter',
      'karma-sourcemap-loader',
      'karma-fixture',
      'karma-html2js-preprocessor',
      'karma-sauce-launcher',
    ],
    // Change this to 'Chrome' if you would like to debug.
    // Can also add additional local browsers like 'Firefox'.
    browsers: ['FirefoxHeadless'],
    // Set this to false to leave the browser open for debugging.
    // You'll probably also need to remove the afterEach block in your tests
    // so the content is not removed from the page you're trying to debug.
    // To isolate a test, use `it.only`.
    // https://mochajs.org/#exclusive-tests
    singleRun: true,
    // Use the mocha test framework with chai assertions.
    // Use polyfills loaded from Polyfill.io.
    // Use an html fixture loader.
    frameworks: ['mocha', 'chai', 'polyfill', 'fixture'],
    // List of polyfills to load from Polyfill.io.
    polyfill: [
      'Array.from', // Used in tests.
      'Promise',
      'Map',
      'Set',
      'Element.prototype.matches',
      'Node.prototype.contains',
    ],
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
  if (process.env.TRAVIS || process.env.SAUCE) {
    // List of browsers to test on SauceLabs.
    // To add more browsers, use:
    // https://docs.saucelabs.com/visual/e2e-testing/supported-browsers/#browser-versions-supported
    const customLaunchers = {
      'SL_Chrome': {
        base: 'SauceLabs',
        browserName: 'chrome',
        version: '100',
      },
      'SL_Firefox': {
        base: 'SauceLabs',
        browserName: 'firefox',
        version: '100',
      },
      'SL_Safari': {
        base: 'SauceLabs',
        browserName: 'safari',
        platform: 'OS X 11.00',
        version: '14',
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