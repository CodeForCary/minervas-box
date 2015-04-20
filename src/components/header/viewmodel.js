import can from 'can';
import 'can/map/define';

export default can.Map.extend({
    define: {},
    getPageUrl: function(pageName) {
        return '#!' + pageName;
    }
});
