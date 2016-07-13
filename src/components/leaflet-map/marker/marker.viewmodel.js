import can from 'can';
import 'can/map/define/define';
import L from 'leaflet';

export default can.Map.extend({
    define: {
        map: {
            Value: Object,
            type: '*'
        }
    },
    addMarker: () => {
        const vm = this;
        const map = vm.attr('map');
        const coords = vm.attr('coords');
        const content = vm.attr('content');

        const opts = [];
        opts.push(coords.attr('latitude'));
        opts.push(coords.attr('longitude'));

        // TODO Can Steal do this?
        L.Icon.Default.imagePath = 'node_modules/leaflet/dist/images';

        const marker = L.marker(opts).addTo(map);
        if (content) {
            marker
                .bindPopup(content)
                .openPopup();
        }
        vm.attr('marker', marker);
    }
});
