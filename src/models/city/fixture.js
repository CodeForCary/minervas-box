import can from 'can';
import 'can/util/fixture/fixture';

var cityList = [
    {id:1, cityKey: 'cary', stateKey: 'nc', cityName: 'Cary', logoSrc:'http://placekitten.com/g/50/50', shortDescription: 'Cary is located southeast of Raleigh.'},
    {id:2, cityKey: 'raleigh', stateKey: 'nc', cityName: 'Raleigh', logoSrc:'http://placekitten.com/g/50/50', shortDescription: 'Raleigh is east of Durham.'},
    {id:3, cityKey: 'durham', stateKey: 'nc', cityName: 'Durham', logoSrc:'http://placekitten.com/g/50/50', shortDescription: 'Durham is north of Cary.'}
];

can.fixture('GET /city.json', function(params) {
    if (params.city) {

    }

    if (params.coords) {

    }
    return cityList;
});

can.fixture('GET /city/{state}/{city}.json', function(req) {
    var filtered = cityList.filter(function (item) {
        return item.stateKey === req.data.state && item.cityKey === req.data.city;
    });
    var resp = filtered.length > 0 ? filtered[0] : {};
    console.log(resp);
    return resp;
});
