import can from 'can';
import 'can/view/stache/stache';
import template from './cities.stache!';
import ViewModel from './cities.viewmodel';
import './cities.less!';

import 'components/geolocation/geolocation';
import 'components/city-list/city-list';
//import 'utils/toggle-filter-attr';

can.Component.extend({
    tag: 'mp-cities',
    template,
    viewModel: ViewModel
});
