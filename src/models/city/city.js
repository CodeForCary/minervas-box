import can from 'can';
import 'can/map/define/define';

export default can.Model.extend({
    findAll: 'GET /city.json',
    findOne: 'GET /city/{state}/{city}.json'
},{});
