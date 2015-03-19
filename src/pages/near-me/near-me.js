import can from 'can';
import 'can/view/stache/stache';
import template from './near-me.stache!';
import viewmodel from './near-me.viewmodel';

can.Component.extend({
    tag: 'mp-near-me',
    template: template,
    scope: viewmodel
});
