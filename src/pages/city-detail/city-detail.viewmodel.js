import can from 'can';
import 'can/map/define/define';
import City from 'models/city/city';

export default can.Map.extend({
    define: {
        city: {
            Value: City
        },
        artParams: {
            value: {}
        },
        artworks: {
            value: []
        }
    },
    City: City
});
