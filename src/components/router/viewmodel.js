import can from 'can';
import 'can/map/define';

export default can.Map.extend({
    define: {
        showRoute: {
            get: function() {
                var routeKey = this.attr('routeKey'),
                    route = typeof can.route.attr(routeKey) === 'undefined'? '': can.route.attr(routeKey);
                    
                if (route == this.attr('routePath')) {
                    return true;
                }
                return false;
            }
        }
    }
});
