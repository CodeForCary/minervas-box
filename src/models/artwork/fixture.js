import can from 'can';
import 'can/util/fixture/fixture';

var artList = [
    {id:1, title: 'Kitty', image: { url:'https://farm6.staticflickr.com/5564/14809337630_27ee502818_n.jpg', alt: 'Kitttty!!!'},description: 'Lorem ipsum'},
    {id:2, title: 'Earth', image: { url:'https://farm1.staticflickr.com/667/20060566163_071da81619_z.jpg', alt: 'Earth'}, description: 'Earth'},
    {id:3, title: 'Space', image: { url:'https://farm4.staticflickr.com/3729/10007371353_4f5708a325_z.jpg', alt: 'Kitttty!!!'}, description: 'SPACE'}
];

can.fixture('GET /artworks', function() {
    return artList;
});

can.fixture('GET /artworks/{id}', function(req) {
    var filtered = artList.filter(function (item) {
        return item.id === req.data.id;
    });
    return filtered;
});
