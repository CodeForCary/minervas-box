import can from 'can';
import 'can/map/define';
import Geolocation from 'models/geolocation/geolocation';

export default can.Map.extend({
    define: {
      location: {
        value: {}
      }
    },
    Geolocation: Geolocation
});
