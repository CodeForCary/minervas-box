/* global navigator */
/* eslint babel/new-cap: 0, no-self-compare: 0 */

import can from 'can';
import 'can/map/define/define';

const Coords = can.Map.extend({
    init: opts => {
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
            // Make sure it is a number and has a specific precision
            type: val => {
                const precision = 1000000;
                // Make sure its always a number
                let resp = parseFloat(val);

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
            type: val => {
                const precision = 1000000;
                // Make sure its always a number
                let resp = parseFloat(val);

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
            get: () => {
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
            get: () => {
                const coordsList = this.attr('coordsList');
                const len = coordsList.attr('length');
                return len > 0 ? coordsList.attr(len - 1) : {};
            },
            set: coords => {
                const coordsList = this.attr('coordsList');
                const len = coordsList.attr('length');
                if (len > 0) {
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
            get: () => {
                return 'geolocation' in navigator;
            }
        }
    },
    getLocation: () => {
        const self = this;
        const def = can.Deferred();

        self.attr('coords', def);

        navigator.geolocation.getCurrentPosition(loc => {
            def.resolve(loc);
        }, err => {
            def.reject(err);
        });

        def.then(loc => {
            loc.coords.timestamp = loc.timestamp;
            self.attr('coords', loc.coords);
        });

        return def;
    },
    watchLocation: () => {
        const self = this;
        const def = can.Deferred();

        self.attr('coords', def);

        const watchId = navigator.geolocation.watchPosition(loc => {
            def.resolve(loc);
        }, err => {
            def.reject(err);
        });

        def.then(position => {
            position.coords.timestamp = position.timestamp;
            self.attr('coords', position.coords);
            self.attr('coords').attr('watchId', watchId);
        });
    }
});
