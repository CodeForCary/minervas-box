import can from 'canjs';
import 'canjs/stache';
import template from './home.stache!';
import viewmodel from './viewmodel';

can.Component.extend({
    tag: 'mp-home',
    template: template,
    scope: viewmodel
});
