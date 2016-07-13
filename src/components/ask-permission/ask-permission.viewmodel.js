import can from 'can';
import 'can/map/define/define';

export default can.Map.extend({
    define: {
        formState: {
            type: 'string',
            value: 'FORM'
        }
    },
    updateState: newState => {
        this.attr('formState', newState);
    }
});
