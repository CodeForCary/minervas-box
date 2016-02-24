import can from 'can';
import 'can/map/define/define';
import Geolocation from 'models/geolocation/geolocation';

export default can.Map.extend({
    define: {
      geo: {
        value: {}
      }
    },
    Geolocation: Geolocation
});
