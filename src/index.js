import $ from 'jquery';
import can from 'can';
//import 'can/route/pushstate';
import 'can/view/stache/stache';
import template from './index.stache!';
import './index.less!';
import 'models/fixtures';
import AppModel from 'models/app-model/app-model';

import 'components/router/router';
import 'components/header/header';

import 'pages/home/home';
import 'pages/cities/cities';
import 'pages/near-me/near-me';

var appModel = new AppModel({});

can.route.bind('route', function(ev, newRoute, oldRoute) {
    appModel.attr('currentRoute', newRoute);
});

can.Component.extend({
    tag: 'minerva-app',
    template: template
});

$('#app').html(can.stache('<minerva-app></minerva-app>')({state:appModel}));

can.route.ready();
