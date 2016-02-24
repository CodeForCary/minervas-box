import can from 'can';
import 'can/view/stache/stache';
import viewmodel from './viewmodel';

can.Component.extend({
    tag: 'bit-geolocation',
    viewModel: viewmodel,
    events: {
        inserted: function () {
            var vm = this.viewModel,
            GeoModel = vm.attr('Geolocation');

            var geo = new GeoModel();
            geo.getLocation();
            vm.attr('geo', geo);
        }
    }
});
