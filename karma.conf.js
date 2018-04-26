var path = require('path');

module.exports = function(config) {
  config.set({
    plugins: [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-mocha',
      'karma-chai',
      'karma-sourcemap-loader'
    ],
    browsers: ['Chrome', 'Firefox'],
    // Set this to false to leave the browser open for debugging.
    singleRun: true,
    // Use the mocha test framework with chai assertions.
    frameworks: ['mocha', 'chai'],
    // The root path location that will be used to resolve all relative paths
    // defined in files and exclude.
    basePath: path.resolve(__dirname, './test'),
    files: [
      'specs/foo.js'
    ],
    // Report output to console.
    reporters: ['dots']
  })
};
