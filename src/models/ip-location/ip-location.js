/* eslint babel/new-cap: 0 */
import can from 'can';
import 'can/map/define/define';
import Storage from 'utils/local-storage';

const storage = new Storage();
const dpipApiKey = '0f5a6c8d64f29d3eda22820a9b52acdbcc315647';
const ipLocUrl = `http://api.db-ip.com/addrinfo?&api_key=${dpipApiKey}&addr=`;

export default can.Model.extend({
    findOne: () => {
        //TODO Use can.Model's makeFindOne?
        let resp;
        let ipDef;
        let ipLocDef;
        return can.Deferred(defer => {
            //check if location was previously resolved
            if (storage.key('ipLocation')) {
                //get location data from storage
                resp = storage.attr('ipLocation');
                //done
                defer.resolve(resp);
            } else {
                //get ip address
                ipDef = can.ajax({
                    url: 'http://tools.endgamestudio.com/clientip.php',
                    type: 'GET'
                });

                ipDef.then(ipData => {
                    //get the IP address physical location
                    ipLocDef = can.ajax({
                        url: ipLocUrl + ipData.ip,
                        type: 'GET'
                    });
                    ipLocDef.then(locData => {
                        resp = ipData;
                        resp.location = locData;

                        //cache the data in localStorage
                        storage.attr('ipLocation', resp);
                        //done
                        defer.resolve(resp);
                    });
                });
            }
        });
    }
}, {});
