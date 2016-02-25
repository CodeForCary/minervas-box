import can from 'can';
import 'can/view/stache/stache';
import template from './leaflet-map.stache!';
import viewmodel from './leaflet-map.viewmodel';
import './leaflet-map.less!';
import L from 'leaflet';

can.Component.extend({
    tag: 'bit-leaflet-map',
    template: template,
    viewModel: viewmodel,
    events: {
        inserted: 'initMap',
        '{viewModel} geo': 'initMap',
        initMap: function () {
            var vm = this.viewModel;
            var geo = vm.attr('geo');
            if (geo && !can.isEmptyObject(geo.attr())) {
                vm.initMap();
            }
        }
    }
});
