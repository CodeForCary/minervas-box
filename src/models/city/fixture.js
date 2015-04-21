import can from 'can';
import 'can/util/fixture';

var cityList = [
    {id:1, cityName: 'Cary', url:'http://placekitten.com/g/300/200', description: 'Lorem ipsum'},
    {id:2, cityName: 'Raleigh', url:'http://placekitten.com/g/200/300', description: 'Kitty cat'},
    {id:3, cityName: 'Durham', url:'https://farm4.staticflickr.com/3729/10007371353_4f5708a325_z.jpg', description: 'SPACE'}
];

can.fixture('GET /city.json', function() {
    return cityList;
});

can.fixture('GET /city/{id}.json', function(req) {
    var filtered = cityList.filter(function (item) {
        return item.id === req.data.id;
    });
    return filtered;
});
