import can from 'can';
import 'can/map/define/define';

export default can.Map.extend({
    define: {
        tabId: {
            get: function () {
                // process tab-title to tab-id
                return 'tab_' + can.underscore(this.attr('tabTitle')).toLowerCase();
            }
        }
    }
});
