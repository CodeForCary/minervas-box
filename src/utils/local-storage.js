/* global window */
import can from 'can';

export default can.Construct.extend({
    hasLocalStorage: false
}, {
    init: () => {
        if (window.localStorage) {
            this.hasLocalStorage = true;
        }
    },
    attr: () => {
        let keyName;
        let val;

        if (arguments.length > 0) {
            keyName = arguments[0];

            if (arguments.length === 2) {
                val = arguments[1];
                if (typeof arguments[1] !== 'string') {
                    val = JSON.stringify(val);
                }
                //TODO Call can fail if localStorage is full
                return window.localStorage.setItem(keyName, val);
            } else {
                //TODO Only parse when it's for sure an object.
                return JSON.parse(window.localStorage.getItem(keyName));
            }
        }
    },
    removeAttr: keyName => {
        return window.localStorage.removeItem(keyName);
    },
    length: () => {
        return window.localStorage.length;
    },
    key: keyName => {
        return window.localStorage.key(keyName) || -1;
    },
    clear: () => {
        return window.localStorage.clear();
    }
});
