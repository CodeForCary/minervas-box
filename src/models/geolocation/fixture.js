import can from 'can';
import 'can/util/fixture/fixture';

can.fixture('GET http://tools.endgamestudio.com/clientip.php', function() {
    return {"ip":"45.37.19.144"};
});

can.fixture('GET http://api.db-ip.com/addrinfo', function() {
    return {"address":"45.37.19.144","country":"US","stateprov":"North Carolina","city":"Durham"};
});
