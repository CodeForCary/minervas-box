import can from 'can';
import 'can/map/define/define';
import Cities from 'models/city/city';

export default can.Map.extend({
    define: {
        cities: {
            value: []
        },
        paginate: {
            value: true,
            type: 'boolean'
        }
    },
    Cities: Cities,
    updateContext: function (hash) {
        can.route.attr(hash);
        return false;
    }
});
