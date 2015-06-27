import can from 'can';
import 'can/map/define/define';
import Storage from 'utils/localStorage';

var storage = Storage(),
  dpipApiKey = '0f5a6c8d64f29d3eda22820a9b52acdbcc315647',
  ipLocUrl = 'http://api.db-ip.com/addrinfo?&api_key='+dpipApiKey+'&addr=';

export default can.Model.extend({
    findOne: function () {
        //TODO Use can.Model's makeFindOne?
        var resp, ipDef, ipLocDef;
        return can.Deferred(function(defer) {
            //check if location was previously resolved
            if (!storage.key('ipLocation')) {
                //get ip address
                ipDef = can.ajax({
                  url: 'http://tools.endgamestudio.com/clientip.php',
                  type: 'GET'
                });

                ipDef.then(function (ipData) {
                    //get the IP address physical location
                    ipLocDef = can.ajax({
                      url: ipLocUrl +ipData.ip,
                      type: 'GET'
                    });
                    ipLocDef.then(function (locData) {
                        resp = ipData;
                        resp.location = locData;

                        //cache the data in localStorage
                        storage.attr('ipLocation', resp);
                        //done
                        defer.resolve(resp);
                    });
                });
            } else {
              //get location data from storage
              resp = storage.attr('ipLocation');
              //done
              defer.resolve(resp);
            }

        });
    }
},{});
