import can from 'canjs';
import template from './art-photo.stache!';
import viewmodel from './viewmodel';

can.Component.extend({
    tag: 'ma-art-photo',
    template: template,
    scope: viewmodel
});
