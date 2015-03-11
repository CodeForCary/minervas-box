var gulp = require('gulp'),
    gu = require('gulp-util'),
    browserSync = require('browser-sync'),
    config = require('../../config.js').server;
    
gulp.task('server', function() {
    browserSync({
        server: {
            baseDir: config.build
        }
    });
    
});
