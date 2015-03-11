import $ from 'jquery';
import can from 'canjs';
import 'canjs/stache';
import template from './index.stache!';
import './index.less!'

can.Component.extend({
    tag: 'main-app',
    template: template
});

$('#app').html(can.stache('<main-app></main-app>')({}));
