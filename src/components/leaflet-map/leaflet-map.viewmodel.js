import can from 'can';
import 'can/map/define/define';
import uid from 'utils/uid';

export default can.Map.extend({
    define: {
        mapId: {
            value: 'map_' + uid(),
            type: 'string'
        },
        geo: {
            Value: Object
        },
        map: {
            value: null,
            type: '*'
        },
        minZoom: {
            value: 13,
            type: 'number'
        }
    },
    initMap: function () {
        var vm = this;
        var coords = vm.attr('geo.coords');
        var opts = [];
        opts.push(coords.attr('latitude'));
        opts.push(coords.attr('longitude'));

        var map = L.map(vm.attr('mapId'))
            .setView(opts, vm.attr('minZoom'));

        // Add tiles to map
        L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        vm.attr('map', map);
    }
});
