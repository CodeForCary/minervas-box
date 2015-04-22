import can from 'can';
import 'can/map/define';

export default can.Model.extend({
    findAll: 'GET /city.json',
    findOne: 'GET /city/{id}.json'
},{});
