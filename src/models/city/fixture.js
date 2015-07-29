import can from 'can';
import 'can/util/fixture/fixture';
import cities from './cities.json';
var cityList = new can.List(cities);

can.fixture('GET /cities', function(req) {
    var resp = cityList,
        params = req.data,
        limit = params.limit || 5,
        count = 0;

    if (params.city) {
        resp = resp.filter(function (item) {
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

    if (params.limit) {
        resp = resp.slice(0, params.limit);
    }

    return {data: resp.attr(), count: count};
});

can.fixture('GET /cities/{state}/{city}', function(req) {
    var filtered = cityList.filter(function (item) {
        return item.stateKey === req.data.state && item.cityKey === req.data.city;
    });
    var resp = filtered.length > 0 ? filtered[0] : {};
    return resp;
});
