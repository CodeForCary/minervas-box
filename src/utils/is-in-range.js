import can from 'can';

const defaults = {
    includeLow: false,
    includeHigh: false
};

const inRange = (low, high, value, opts) => {
    const options = can.extend(defaults, opts);
    let resp;

    if (options.includeLow) {
        low -= 1;
    }

    if (options.includeHigh) {
        high += 1;
    }

    if (value > low && value < high) {
        resp = 'IN_RANGE';
    }

    if (value < low) {
        resp = 'BELOW_RANGE';
    }

    if (value > high) {
        resp = 'ABOVE_RANGE';
    }

    return resp;
};

const inRangeArray = (arr, value) => {
    const arrayOpts = {
        includeLow: true,
        includeHigh: true
    };
    return inRange(0, arr.length - 1, value, arrayOpts);
};

export {inRange};
export {inRangeArray};
