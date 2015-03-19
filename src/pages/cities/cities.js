import can from 'can';
import 'can/view/stache/stache';
import template from './cities.stache!';
import viewmodel from './cities.viewmodel';

can.Component.extend({
    tag: 'mp-cities',
    template: template,
    scope: viewmodel
});
