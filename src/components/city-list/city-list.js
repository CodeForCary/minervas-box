import can from 'can';
import 'can/view/stache/stache';
import template from './city-list.stache!';
import viewmodel from './viewmodel';
import './city-list.less!';

import 'bit-data-suite/bit-search/';
import 'bit-data-suite/bit-pagination/';
import 'components/flag-image/';

can.Component.extend({
    tag: 'ma-city-list',
    template,
    scope: viewmodel,
    events: {
        '{params} change': (params, ev, key) => {
            if (key === 'city') {
                params.attr('offset', 0);
            }
        }
    }
});
