import can from 'can';
import 'can/view/stache/stache';
import template from './home.stache!';
import ViewModel from './viewmodel';
import './home.less!';

import 'components/city-list/city-list';
import 'components/ask-permission/';
import 'components/leaflet-map/leaflet-map';
import 'components/leaflet-map/marker/marker';

can.Component.extend({
    tag: 'mp-home',
    template,
    viewModel: ViewModel
});
