import can from 'can';
import 'can/view/stache/stache';
import template from './header.stache!';
import viewmodel from './viewmodel';

can.Component.extend({
    tag: 'ma-header',
    template,
    scope: viewmodel
});
