import can from 'canjs';
import 'canjs/stache';
import template from './header.stache!';
import viewmodel from './viewmodel';

can.Component.extend({
    tag: 'ma-header',
    template: template,
    scope: viewmodel
});
