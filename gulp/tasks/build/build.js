var gulp = require('gulp'),
    gu = require('gulp-util'),
    steal = require('steal-tools'),
    del = require('del'),
    rename = require('gulp-rename'),
    replace = require('gulp-replace'),
    config = require('../../config.js').build;

gulp.task('clear_build', function () {
    del(['dist','_dist']);
});

gulp.task('build', ['clear_build'], function() {

    gulp.src('src/index.prod.html')
        .pipe(rename('index.html'))
        .pipe(gulp.dest('_dist'));

    var promise = steal.build({
        main: "src/index",
        config: "package.json!npm",
        bundlesPath: '_dist'
    },{
        bundleSteal: true,
        minify: false,
        debug: true
    });

    promise.then( function () {
        gulp.src('_dist/**/*.*')
            //TODO clean this up so it can build for dev or prod
            .pipe(replace(/_dist\//g,'minervas-box/'))
            //TODO Add cache busting to scripts
            .pipe(gulp.dest('dist'));
        //TODO Clean up the temp folder `_dist` when build is done
    });
});
