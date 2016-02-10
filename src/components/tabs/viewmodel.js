import can from 'can';
import 'can/map/define/define';

export default can.Map.extend({
    define: {
        tabs: {
            value: []
        },
        activeTab: {
            value: {}
        }
    },
    isActive: function (ctx) {
        return ctx === this.attr('activeTab');
    },
    register: function (tabVM) {
        this.attr('tabs').push(tabVM);
    },
    toggleTab: function (ctx) {
        this.attr('activeTab', ctx);
    }
});
