var gulp = require('gulp'),
    gu = require('gulp-util'),
    jshint = require('gulp-jshint'),
    config = require('../../config.js').jshint;
    
gulp.task('jshint', function() {
    return gulp.src(config.src)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
    
});
