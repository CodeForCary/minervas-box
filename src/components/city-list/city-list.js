import can from 'can';
import 'can/view/stache/stache';
import template from './city-list.stache!';
import viewmodel from './viewmodel';
import './city-list.less!';

import 'bit-grid/bit-search/';
import 'bit-grid/bit-pagination/';

can.Component.extend({
    tag: 'ma-city-list',
    template: template,
    scope: viewmodel,
    events: {
        '{params} change': function (params, ev, key) {
            if (key === 'city') {
                params.attr('offset', 0);
            }
        }
    }
});
