var gulp = require('gulp');
var babel = require('gulp-babel');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');
var del = require('del');

var paths = {
  scripts: {
    src: './src/inert.js',
    dest: 'dist'
  }
};

function clean() {
  return del([paths.scripts.dest]);
}

function scripts() {
  return gulp.src(paths.scripts.src)
    .pipe(sourcemaps.init())
    .pipe(babel({
      presets: ['es2015']
    }))
    .pipe(gulp.dest(paths.scripts.dest))
    .pipe(uglify())
    .pipe(rename('inert.min.js'))
    .pipe(gulp.dest(paths.scripts.dest));
}

function watch() {
  gulp.watch(paths.scripts.src, scripts);
}

/*
 * Gulp 4 lets you use `exports` module notation to declare tasks. Wheeeeee!
 */
exports.clean = clean;
exports.scripts = scripts;
exports.watch = watch;

gulp.task('default', gulp.series(clean, scripts));
