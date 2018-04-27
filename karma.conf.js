var path = require('path');

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
};
