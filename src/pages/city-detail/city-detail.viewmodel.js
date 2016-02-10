import can from 'can';
import 'can/map/define/define';
import City from 'models/city/city';
import Artwork from 'models/artwork/artwork';

export default can.Map.extend({
    define: {
        city: {
            Value: City
        },
        artParams: {
            value: {
                limit: 5
            }
        },
        artworks: {
            value: []
        }
    },
    Artwork: Artwork,
    City: City
});
