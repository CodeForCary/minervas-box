import can from 'can';
import 'can/map/define/define';
import Cities from 'models/city/city';

export default can.Map.extend({
    define: {
        cities: {
            value: []
        }
    },
    Cities: Cities,
});
