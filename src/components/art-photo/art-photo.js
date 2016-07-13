import can from 'can';
import 'can/view/stache/stache';
import template from './art-photo.stache!';
import viewmodel from './viewmodel';

can.Component.extend({
    tag: 'ma-art-photo',
    template,
    scope: viewmodel
});
