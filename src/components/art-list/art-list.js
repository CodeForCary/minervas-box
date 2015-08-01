import can from 'can';
import 'can/view/stache/stache';
import template from './art-list.stache!';
import viewmodel from './viewmodel';
import './art-list.less!';


can.Component.extend({
    tag: 'ma-art-list',
    template: template,
    scope: viewmodel
});
