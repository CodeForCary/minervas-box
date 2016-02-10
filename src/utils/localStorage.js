import can from 'can';


export default can.Construct.extend({
  hasLocalStorage: false
},{
  init: function () {
    if (window.localStorage) {
      this.hasLocalStorage = true;
    }
  },
  attr: function () {
    var keyName, val;

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

    return;
  },
  removeAttr: function (keyName) {
    window.localStorage.removeItem(keyName);
  },
  length: function () {
    window.localStorage.length;
  },
  key: function (keyName) {
    window.localStorage.key(keyName) || -1;
  },
  clear: function () {
    window.localStorage.clear();
  }
});
