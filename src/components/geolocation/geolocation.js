import can from 'can';
import 'can/view/stache/stache';
import viewmodel from './viewmodel';

can.Component.extend({
    tag: 'bit-geolocation',
    viewModel: viewmodel,
    events: {
        inserted: () => {
            const vm = this.viewModel;
            const GeoModel = vm.attr('Geolocation');

            const geo = new GeoModel();
            geo.getLocation();
            vm.attr('geo', geo);
        }
    }
});
