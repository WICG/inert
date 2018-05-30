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
    browsers: ['ChromeHeadless'],
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
    // https://wiki.saucelabs.com/display/DOCS/Platform+Configurator#/
    // This set of browsers was copied from:
    // https://github.com/angular/angular.js/blob/master/karma-shared.conf.js#L42-L116
    const customLaunchers = {
      'SL_Chrome': {
        base: 'SauceLabs',
        browserName: 'chrome',
        version: 'latest',
      },
      'SL_Chrome-1': {
        base: 'SauceLabs',
        browserName: 'chrome',
        version: 'latest-1',
      },
      'SL_Firefox': {
        base: 'SauceLabs',
        browserName: 'firefox',
        version: 'latest',
      },
      'SL_Firefox-1': {
        base: 'SauceLabs',
        browserName: 'firefox',
        version: 'latest-1',
      },
      'SL_Safari-1': {
        base: 'SauceLabs',
        browserName: 'safari',
        platform: 'OS X 10.12',
        version: 'latest-1',
      },
      'SL_Safari': {
        base: 'SauceLabs',
        browserName: 'safari',
        platform: 'OS X 10.13',
        version: 'latest',
      },
      // 'SL_IE_9': {
      //   base: 'SauceLabs',
      //   browserName: 'internet explorer',
      //   platform: 'Windows 2008',
      //   version: '9',
      // },
      // 'SL_IE_10': {
      //   base: 'SauceLabs',
      //   browserName: 'internet explorer',
      //   platform: 'Windows 2012',
      //   version: '10',
      // },
      'SL_IE_11': {
        base: 'SauceLabs',
        browserName: 'internet explorer',
        platform: 'Windows 8.1',
        version: '11',
      },
      'SL_EDGE': {
        base: 'SauceLabs',
        browserName: 'microsoftedge',
        platform: 'Windows 10',
        version: 'latest',
      },
      'SL_EDGE-1': {
        base: 'SauceLabs',
        browserName: 'microsoftedge',
        platform: 'Windows 10',
        version: 'latest-1',
      },
      // 'SL_iOS_10': {
      //   base: 'SauceLabs',
      //   browserName: 'iphone',
      //   version: '10.3',
      // },
      // 'SL_iOS_11': {
      //   base: 'SauceLabs',
      //   browserName: 'iphone',
      //   version: '11',
      // },
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
