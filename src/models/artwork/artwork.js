import can from 'can';
import 'can/map/define/define';

export default can.Model.extend({
    findAll: 'GET /artworks',
    findOne: 'GET /artworks/{id}'
}, {});
