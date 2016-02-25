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
    addMarker: function () {
        var vm = this;
        var map = vm.attr('map');
        var coords = vm.attr('coords');
        var content = vm.attr('content');

        var opts = [];
        opts.push(coords.attr('latitude'));
        opts.push(coords.attr('longitude'));

        // TODO Can Steal do this?
        L.Icon.Default.imagePath = 'node_modules/leaflet/dist/images';

        var marker = L.marker(opts).addTo(map);
        if (content) {
            marker
                .bindPopup(content)
                .openPopup();
        }
        vm.attr('marker', marker);
    }
});
