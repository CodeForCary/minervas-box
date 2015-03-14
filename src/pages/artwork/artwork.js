import can from 'canjs';
import 'canjs/stache';
import template from './artwork.stache!';
import viewmodel from './viewmodel';

can.Component.extend({
    tag: 'mp-artwork',
    template: template,
    scope: viewmodel
});
