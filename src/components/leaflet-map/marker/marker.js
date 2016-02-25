import can from 'can';
import 'can/view/stache/stache';
import viewmodel from './marker.viewmodel';
import L from 'leaflet';

can.Component.extend({
    tag: 'bit-map-marker',
    viewModel: viewmodel,
    events: {
        inserted: function () {
            this.viewModel.addMarker();
        },
        '{viewModel} map': function () {
            this.viewModel.addMarker();
        }
    }
});
