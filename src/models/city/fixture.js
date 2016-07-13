import can from 'can';
import 'can/util/fixture/fixture';
import cities from './cities.json';

const cityList = new can.List(cities);

can.fixture('GET /cities', req => {
    let resp = cityList;
    const params = req.data;
    const limit = params.limit || 5;
    let count = 0;

    if (params.city) {
        resp = resp.filter(item => {
            return item.attr('cityName').toLowerCase().indexOf(params.city.toLowerCase()) > -1;
        });
    }

    // if (params.coords) {
    //
    // }

    count = resp.length;

    if (params.offset) {
        resp = resp.slice(params.offset);
    }

    if (limit) {
        resp = resp.slice(0, limit);
    }

    return {
        data: resp.attr(),
        count
    };
});

can.fixture('GET /cities/{state}/{city}', req => {
    const filtered = cityList.filter(item => {
        return item.stateKey === req.data.state && item.cityKey === req.data.city;
    });
    return filtered.length > 0 ? filtered[0] : {};
});
