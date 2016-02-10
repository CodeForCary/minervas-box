import can from 'can';
import 'can/view/stache/stache';
import template from './city-details.stache!';
import viewmodel from './viewmodel';
import './city-details.less!';

export default can.Component.extend({
    tag: 'ma-city-details',
    template: template,
    scope: viewmodel
});
