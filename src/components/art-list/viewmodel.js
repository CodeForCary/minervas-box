import can from 'can';
import 'can/map/define/define';
import Artwork from 'models/artwork/artwork';

export default can.Map.extend({
    define: {
        artworks: {
            value: []
        },
        defaultItem: {
            get: () => {
                const items = this.attr('artworks');
                return items && items.length ? items[0].attr('title') : '';
            }
        }
    },
    Artwork,
    updateContext: hash => {
        can.route.attr(hash);
        return false;
    }
});
