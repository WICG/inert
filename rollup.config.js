import {uglify} from 'rollup-plugin-uglify';
import babel from 'rollup-plugin-babel';

export default [
  {
    input: 'src/inert.js',
    output: {
      file: 'dist/inert.js',
      format: 'umd',
      name: 'inert'
    },
    plugins: [
      babel({
        exclude: 'node_modules/**',
      }),
    ],
  },
  {
    input: 'src/inert.js',
    output: {
      file: 'dist/inert.min.js',
      format: 'umd',
      name: 'inert',
      sourcemap: true,
    },
    plugins: [
      babel({
        exclude: 'node_modules/**',
      }),
      uglify(),
    ],
  },
];
