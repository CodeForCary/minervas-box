import can from 'can';
import 'can/util/fixture';

can.fixture('GET http://tools.endgamestudio.com/clientip.php', function() {
    return {"ip":"45.37.19.144"};
});
