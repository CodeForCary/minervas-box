import can from 'can';
import 'can/map/define/define';

const Coords = can.Map.extend({
    init: function (opts) {
        if (opts && !can.isEmptyObject(opts)) {
            this.attr('isEmpty', false);
        }
    },
    define: {
        isEmpty: {
            value: true,
            type: 'boolean'
        },
        accuracy: {},
        altitude: {
            type: 'number'
        },
        altitudeAccuracy: {},
        heading: {},
        latitude: {
            // Make sur it is a number and has a specific precision
            type: function (val) {
                var precision = 1000000;
                // Make sure its always a number
                var resp = parseFloat(val);

                // Check if NaN
                if (resp === resp) {
                    // trim to 5 digits
                    resp = Math.round(resp * precision) / precision;
                } else {
                    resp = 0;
                }

                return resp;
            }
        },
        longitude: {
            // Make sur it is a number and has a specific precision
            type: function (val) {
                var precision = 1000000;
                // Make sure its always a number
                var resp = parseFloat(val);

                // Check if NaN
                if (resp === resp) {
                    // trim to 5 digits
                    resp = Math.round(resp * precision) / precision;
                } else {
                    resp = 0;
                }

                return resp;
            }
        },
        speed: {
            type: 'number'
        },
        timestamp: {
            type: 'number'
        },
        watchId: {
            value: -1,
            type: 'number'
        },
        isWatch: {
            get: function () {
                return this.attr('watchId') > -1;
            }
        }
    }
});

const CoordsList = can.List.extend();

CoordsList.Map = Coords;

export default can.Map.extend({
    define: {
        coords: {
            get: function () {
                var coordsList = this.attr('coordsList');
                var len = coordsList.attr('length');
                return len > 0 ? coordsList.attr(len - 1) : {};
            },
            set: function (coords) {
                var coordsList = this.attr('coordsList');
                var len = coordsList.attr('length');
                if (len > 0){
                    coordsList.splice(len - 1, 1, coords);
                } else {
                    coordsList.push(coords);
                }
            },
            Type: Coords
        },
        coordsList: {
            Value: Array,
            Type: CoordsList
        },
        apiAvailable: {
            value: false,
            get: function () {
                return "geolocation" in navigator;
            }
        }
    },
    getLocation: function () {
        var self = this;
        var def = can.Deferred();

        self.attr('coords', def);

        navigator.geolocation.getCurrentPosition(function (loc) {
            def.resolve(loc);
        }, function (err) {
            def.reject(err);
        });

        def.then(function (loc) {
            loc.coords.timestamp = loc.timestamp;
            self.attr('coords', loc.coords);
        });

        return def;

    },
    watchLocation: function () {
        var self = this;
        var def = can.Deferred();

        self.attr('coords', def);

        var watchId = navigator.geolocation.watchPosition(function (loc) {
            def.resolve(loc);
        }, function (err) {
            def.reject(err);
        });

        def.then(function(position) {
            loc.coords.timestamp = loc.timestamp;
            self.attr('coords', loc.coords);
            self.attr('coords').attr('watchId', watchId);
        });

    }
});
