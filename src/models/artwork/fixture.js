import can from 'can';
import 'can/util/fixture/fixture';
import artList from './artwork.data.json!';

can.fixture('GET /artworks', () => {
    return artList;
});

can.fixture('GET /artworks/{id}', req => {
    return artList.filter(item => {
        return item.id === req.data.id;
    });
});
