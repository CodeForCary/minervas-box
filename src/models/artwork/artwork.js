import can from 'can';
import 'can/map/define/define';

export default can.Model.extend({
    findAll: 'GET /artwork.json',
    findOne: 'GET /artwork/{id}.json'
},{});
