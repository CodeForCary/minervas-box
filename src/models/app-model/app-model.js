import can from 'can';
import 'can/map/define/define';

const Toggles = can.Map.extend({
    define: {
        useGeo: {
            value: false,
            type: 'boolean'
        }
    }
});

export default can.Map.extend({
    define: {
        city: {
            value: '',
            type: 'string'
        },
        geo: {
            Value: Object,
            type: '*',
            serialize: false
        },
        toggles: {
            Value: Object,
            Type: Toggles,
            serialize: false
        }
    }
});
