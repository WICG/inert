const path = require('path');

module.exports = function(config) {
  config.set({
    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-mocha',
      'karma-chai',
      'karma-sourcemap-loader',
      'karma-fixture',
      'karma-html2js-preprocessor',
      'karma-sauce-launcher',
    ],
    browsers: ['Chrome'],
    // Set this to false to leave the browser open for debugging.
    singleRun: true,
    // Use the mocha test framework with chai assertions.
    frameworks: ['mocha', 'chai', 'fixture'],
    preprocessors: {
      '**/*.html': ['html2js'],
    },
    // The root path location that will be used to resolve all relative paths
    // defined in files and exclude.
    basePath: path.resolve(__dirname),
    files: [
      'dist/inert.js',
      'test/fixtures/**/*',
      'test/specs/element.js',
      'test/specs/basic.js',
    ],
    // Report output to console.
    reporters: ['dots'],
  });

  // If we're on Travis, run tests on SauceLabs.
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
        testName: 'Inert Tests',
        username: 'robdodson_inert',
        accessKey: 'a844aee9-d3ec-4566-94e3-dba3d0c30248',
      },
      // Increase timeout in case connection in CI is slow
      captureTimeout: 120000,
      customLaunchers: customLaunchers,
      browsers: Object.keys(customLaunchers),
      reporters: ['dots', 'saucelabs'],
    });
  }
};
