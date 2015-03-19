System.config({
    map: {
        "can/can"               : "can",
        "can/map/define"        : "can/map/define/define",
        "can/route/pushstate"   : "can/route/pushstate/pushstate",
        "can/util/fixture"      : "can/util/fixture/fixture",
        "jquery/jquery"         : "jquery"
    },
    paths: {
        'jquery'        : '../node_modules/jquery/dist/jquery.min.js',
        'can'           : '../bower_components/canjs/can.js',
        'can/*'         : '../bower_components/canjs/*.js',
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
