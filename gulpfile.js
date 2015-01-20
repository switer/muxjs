var gulp = require('gulp');
var webpack = require('gulp-webpack');
var uglify = require('gulp-uglifyjs');

gulp.task('default', function() {
    return gulp.src('index.js')
        .pipe(webpack({
            output: {
                library: 'Mux',
                libraryTarget: 'umd',
                filename: 'mux.js'
            }
        }))
        .pipe(gulp.dest('dist/'))
        .pipe(uglify('mux.min.js', {
            mangle: true,
            compress: true
        }))
        .pipe(gulp.dest('dist/'))
});
