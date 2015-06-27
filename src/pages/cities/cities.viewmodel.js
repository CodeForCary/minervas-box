import can from 'can';
import 'can/map/define/define';
import City from 'models/city/city';

export default can.Map.extend({
    define: {
        cities: {
            value: []
        }
    },
    City: City,
    updateContext: function (hash) {
      can.route.attr(hash);
      return false;
    }
});
