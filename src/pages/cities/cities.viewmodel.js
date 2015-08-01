import can from 'can';
import 'can/map/define/define';

export default can.Map.extend({
    define: {
        showSearch: {
            value: false,
            type:'boolean'
        },
        params: {
            value: {
                offset:0,
                limit:3
            }
        }
    },
    toggleFilter: function (ctx, $el) {
        var val = $el.text();

        if (val === 'Near Me') {
          //do geolocation
          return;
        }

        if (val === 'Search') {
          this.attr('showSearch', !this.attr('showSearch'));
        }
    }
});
