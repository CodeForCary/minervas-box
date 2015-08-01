import can from 'can';
import 'can/map/define/define';

export default can.Map.extend({
    define: {
        params: {
            value: {
                offset: 0,
                limit: 5
            }
        }
    }
});
