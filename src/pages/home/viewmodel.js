import can from 'can';
import 'can/map/define/define';

export default can.Map.extend({
    define: {
        params: {
            value: {
                offset: 0,
                limit: 5
            }
        },
        citySearch: {
            value: false,
            type: 'boolean'
        },
        askGeoPermission: {
            get: function () {
                var state = this.attr('state');
                return state.attr('toggles.useGeo') === false && this.attr('citySearch') === false;
            }
        }
    },
    showMap: function () {
        this.attr('state.toggles.useGeo', true);
    },
    showCitySearch: function () {
        this.attr('state.toggles.useGeo', false);
        this.attr('citySearch', true);
    }
});
