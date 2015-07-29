import can from 'can';
import 'can/map/define/define';
import Cities from 'models/city/city';

export default can.Map.extend({
    define: {
        showSearch: {
            value: false,
            type:'boolean'
        },
        cities: {
            value: []
        },
        params: {
            value: {
                offset:0,
                limit:3
            }
        }
    },
    Cities: Cities,
    updateContext: function (hash) {
        can.route.attr(hash);
        return false;
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
