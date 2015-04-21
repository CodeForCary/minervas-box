import can from 'can';
import 'can/map/define';
import City from 'models/city';

export default can.Map.extend({
    define: {
        cities: {
            value: []
        }
    },
    City: City
});
