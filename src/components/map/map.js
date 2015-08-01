import can from 'can';
import 'can/view/stache/stache';
import template from './map.stache!';
import viewmodel from './viewmodel';
import './map.less!';


can.Component.extend({
    tag: 'ma-map',
    template: template,
    scope: viewmodel
});
