import can from 'can';
import 'can/util/fixture/fixture';

can.fixture('GET http://tools.endgamestudio.com/clientip.php', function() {
    return {"ip":"45.37.19.144"};
});

can.fixture('GET http://api.db-ip.com/addrinfo?api_key=0f5a6c8d64f29d3eda22820a9b52acdbcc315647&addr=45.37.19.144', function() {
    return {"address":"45.37.19.144","country":"US","stateprov":"North Carolina","city":"Durham"};
});
