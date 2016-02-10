import can from 'can';
import 'can/map/define/define';

export default can.Map.extend({
    define: {
        itemTitle: {
            value: '',
            type: 'string'
        },
        tabId: {
            get: function () {
                // process tab-title to tab-id
                return 'tab_' + can.underscore(this.attr('itemTitle')).toLowerCase();
            }
        }
    }
});
