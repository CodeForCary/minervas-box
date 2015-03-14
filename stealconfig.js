System.config({
    paths: {
        'jquery'        : '../node_modules/jquery/dist/jquery.min.js',
        'canjs'         : '../bower_components/canjs/can.jquery.js',
        'canjs/*'       : '../bower_components/canjs/can.*.js',
        'bootstrap'     : '../node_modules/bootstrap/dist/js/bootstrap.js',
        'bootstrap/*'   : '../node_modules/bootstrap/js/*.js',
        //'qunit'         : '../bower_components/qunit/qunit/qunit.js',
        //'funcunit'      : '../bower_components/funcunit/dist/funcunit.js',
        'components/*'  : '../src/components/*.js',
        'models/*'      : '../src/models/*.js',
        'pages/*'       : '../src/pages/*.js'
    },
    meta: {
        jquery: {
            exports: 'jQuery'
        },
        canjs:{
            exports:'can'
        }
    },
    ext: {
        stache: 'src/utils/stache'
    }
 });
