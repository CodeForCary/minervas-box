import $ from 'jquery';
import can from 'can';
import 'can/route/pushstate';
import 'can/view/stache/stache';
import template from './index.stache!';
import './index.less!'

can.Component.extend({
    tag: 'main-app',
    template: template
});

$('#app').html(can.stache('<minerva-app></minerva-app>')({state:appModel}));

can.route.ready();
