import can from 'canjs';
import 'canjs/map.define';

export default can.Map.extend({
    define: {},
    getPageUrl: function(pageName) {
        return can.route.url({page: pageName});
    }
});
