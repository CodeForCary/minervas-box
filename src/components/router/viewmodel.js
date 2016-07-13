import can from 'can';
import 'can/map/define/define';

export default can.Map.extend({
    define: {
        showRoute: {
            get: () => {
                const routePath = this.attr('routePath');
                const currentRoute = typeof can.route.attr('route') === 'undefined' ? '' : can.route.attr('route');

                if (currentRoute === routePath) {
                    return true;
                }
                return false;
            }
        }
    }
});
