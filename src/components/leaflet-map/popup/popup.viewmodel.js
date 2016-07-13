import can from 'can';
import 'can/map/define/define';
import L from 'leaflet';

export default can.Map.extend({
    define: {
        map: {
            value: null,
            type: '*'
        }
    },
    addPopup: () => {
        const vm = this;
        const map = vm.attr('map');
        const coords = vm.attr('coords');
        const content = vm.attr('content');

        const opts = [];
        opts.push(coords.attr('latitude'));
        opts.push(coords.attr('longitude'));

        // Add popup
        const popup = L.popup()
            .setLatLng(opts)
            .setContent(content)
            .openOn(map);

        vm.attr('popup', popup);
    }
});
