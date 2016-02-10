import can from 'can';
import 'can/view/stache/stache';
import template from './home.stache!';
import viewmodel from './viewmodel';
import './home.less!';

import 'components/city-list/city-list';

can.Component.extend({
    tag: 'mp-home',
    template: template,
    scope: viewmodel
});
