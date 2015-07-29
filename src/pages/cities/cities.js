import can from 'can';
import 'can/view/stache/stache';
import template from './cities.stache!';
import viewmodel from './cities.viewmodel';
import './cities.less!';

import 'components/geolocation/geolocation';
import 'bit-grid/bit-search/';
import 'bit-grid/bit-pagination/';
//import 'utils/toggleFilterAttr';

can.Component.extend({
    tag: 'mp-cities',
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
