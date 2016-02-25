import can from 'can';
import 'can/view/stache/stache';
import viewmodel from './popup.viewmodel';
import L from 'leaflet';

can.Component.extend({
    tag: 'bit-map-popover',
    viewModel: viewmodel,
    events: {
        inserted: function () {
            this.viewModel.addPopup();
        },
        '{viewModel} map': function () {
            this.viewModel.addPopup();
        }
    }
});
