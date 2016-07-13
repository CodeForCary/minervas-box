var gulp = require('gulp');
var browserSync = require('browser-sync');
var config = require('../config.js').server;

gulp.task('server', function () {
    browserSync({
        server: {
            baseDir: config.prod.build
        }
    });
});

gulp.task('server:dev', function () {
    browserSync({
        server: {
            baseDir: config.dev.build
        }
    });
});

gulp.task('server:prod', ['build'], function () {
    browserSync({
        server: {
            baseDir: config.prod.build
        }
    });
});
