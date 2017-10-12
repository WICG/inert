/**
 * This work is licensed under the W3C Software and Document License
 * (http://www.w3.org/Consortium/Legal/2015/copyright-software-and-document).
 */
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const babel = require('rollup-plugin-babel');
const uglify = require('rollup-plugin-uglify');

module.exports = [{
  entry: 'src/inert.js',
  format: 'umd',
  dest: 'dist/inert.js',
  plugins: [
    resolve({jsnext: true, main: true}),
    commonjs(),
    babel({
      exclude: 'node_modules/**', // only transpile our source code
    }),
  ],
}, {
  entry: 'src/inert.js',
  format: 'umd',
  dest: 'dist/inert.min.js',
  plugins: [
    resolve({jsnext: true, main: true}),
    commonjs(),
    babel({
      exclude: 'node_modules/**', // only transpile our source code
    }),
    uglify(),
  ],
}];
