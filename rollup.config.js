import uglify from 'rollup-plugin-uglify';

export default [
  {
    input: 'src/inert.js',
    output: {
      file: 'dist/inert.js',
      format: 'umd'
    }
  },
  {
    input: 'src/inert.js',
    output: {
      file: 'dist/inert.min.js',
      format: 'umd',
      sourcemap: true
    },
    plugins: [uglify()]
  }
];
