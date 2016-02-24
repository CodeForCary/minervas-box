import can from 'can';
import 'can/view/stache/stache';
import template from './leaflet-map.stache!';
import viewmodel from './leaflet-map.viewmodel';
import './leaflet-map.less!';


can.Component.extend({
    tag: 'bit-leaflet-map',
    template: template,
    scope: viewmodel
});
