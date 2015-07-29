import can from 'can';
import 'can/map/define/define';
import City from 'models/city/city';
import Artwork from 'models/artwork/artwork';

export default can.Map.extend({
    define: {
        artworks: {
            value: []
        },
        city: {
            Value: City
        }
    },
    City: City,
    Artwork: Artwork
});
