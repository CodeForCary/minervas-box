import can from 'can';

var defaults = {
    includeLow: false,
    includeHigh: false
};

const inRange = function (low, high, value, opts) {
    var options = can.extend(defaults, opts);
    var resp;

    if (options.includeLow) {
        low = low - 1;
    }

    if (options.includeHigh) {
        high = high + 1;
    }

    if (value > low && value < high ) {
        resp = 'IN_RANGE';
    }

    if (value < low) {
        resp = 'BELOW_RANGE';
    }

    if (value > high) {
        resp = 'ABOVE_RANGE';
    }

    return resp;
}


const inRangeArray = function (arr, value) {
    var arrayOpts = {
        includeLow: true,
        includeHigh: true
    };
    return inRange(0, arr.length - 1, value, arrayOpts);
}

export {inRange};
export {inRangeArray};
