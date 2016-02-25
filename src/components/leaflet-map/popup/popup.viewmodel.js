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
    addPopup: function () {
        var vm = this;
        var map = vm.attr('map');
        var coords = vm.attr('coords');
        var content = vm.attr('content');

        var opts = [];
        opts.push(coords.attr('latitude'));
        opts.push(coords.attr('longitude'));

        // Add popup
        var popup = L.popup()
            .setLatLng(opts)
            .setContent(content)
            .openOn(map);

        vm.attr('popup', popup);
    }
});
