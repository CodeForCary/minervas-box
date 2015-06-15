import can from 'can';
import 'can/util/fixture';

var cityList = [
    {id:1, cityCode: 'nc/cary', cityName: 'Cary', logoSrc:'http://placekitten.com/g/50/50', shortDescription: 'Cary is located southeast of Raleigh.'},
    {id:2, cityCode: 'nc/raleigh', cityName: 'Raleigh', logoSrc:'http://placekitten.com/g/50/50', shortDescription: 'Raleigh is east of Durham.'},
    {id:3, cityCode: 'nc/durham', cityName: 'Durham', logoSrc:'http://placekitten.com/g/50/50', shortDescription: 'Durham is north of Cary.'}
];

can.fixture('GET /city.json', function(params) {
    if (params.city) {

    }

    if (params.coords) {
      
    }
    return cityList;
});

can.fixture('GET /city/{id}.json', function(req) {
    var filtered = cityList.filter(function (item) {
        return item.id === req.data.id;
    });
    return filtered;
});
