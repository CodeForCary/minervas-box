import can from 'can';
import 'can/view/stache/stache';
import template from './city-detail.stache!';
import ViewModel from './city-detail.viewmodel';
import './city-detail.less!';

import 'components/leaflet-map/leaflet-map';
import 'components/art-list/art-list';
import 'components/tabs/tabs';
import 'bit-data-suite/bit-search/';
import 'components/city-details/';

can.Component.extend({
    tag: 'mp-city-detail',
    template,
    viewModel: ViewModel,
    events: {
        inserted: () => {
            const vm = this.viewModel;
            const params = {
                city: can.route.attr('city'),
                state: can.route.attr('state')
            };
            const def = vm.City.findOne(params);
            def.then(resp => {
                vm.attr('city', resp);
                vm.attr('artParams').attr('cityId', resp.id);
            });
        }
    }
});
