import can from 'can';
import 'can/util/fixture';

var artList = [
    {id:1, title: 'Heyo', url:'http://placekitten.com/g/300/200', description: 'Lorem ipsum'},
    {id:2, title: 'Meow', url:'http://placekitten.com/g/200/300', description: 'Kitty cat'},
    {id:3, title: 'Space', url:'https://farm4.staticflickr.com/3729/10007371353_4f5708a325_z.jpg', description: 'SPACE'}
];

can.fixture('GET /artwork.json', function() {
    return artList;
});

can.fixture('GET /artwork/{id}.json', function(req) {
    var filtered = artList.filter(function (item) {
        return item.id === req.data.id;
    });
    return filtered;
});
