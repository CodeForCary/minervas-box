import can from 'can';
import 'can/map/define/define';
import Artwork from 'models/artwork/artwork';

export default can.Map.extend({
    define: {
        artworks: {
            value: []
        }
    },
    Artwork: Artwork,
    updateContext: function (hash) {
        can.route.attr(hash);
        return false;
    }
});
