import can from 'can';
import 'can/map/define';
import City from 'models/city/city';

export default can.Map.extend({
    define: {
    },
    City: City,
    city: {}
});
