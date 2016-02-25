import can from 'can';
import 'can/map/define/define';
import City from 'models/city/city';
import Artwork from 'models/artwork/artwork';

export default can.Map.extend({
    define: {
        city: {
            Value: City
        },
        artParams: {
            value: {
                limit: 5
            }
        },
        artworks: {
            value: []
        },
        mapDisabled: {
            value: false,
            type: 'boolean'
        },
        askGeoPermission: {
            get: function () {
                var state = this.attr('state');
                return state.attr('toggles.useGeo') === false && this.attr('mapDisabled') === false;
            }
        }
    },
    showMap: function () {
        this.attr('state.toggles.useGeo', true);
    },
    showCitySearch: function () {
        this.attr('state.toggles.useGeo', false);
        this.attr('mapDisabled', true);
    },
    Artwork: Artwork,
    City: City
});
