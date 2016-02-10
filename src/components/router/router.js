import can from 'can';
import 'can/view/stache/stache';
import template from './router.stache!';
import viewmodel from './viewmodel';

can.Component.extend({
    tag: 'ma-router',
    template: template,
    scope: viewmodel,
    events: {
        inserted: function() {
            var scope = this.scope,
                routeKey = scope.attr('routeKey'),
                routePath = scope.attr('routePath'),
                routeTarget = scope.attr('routeTarget'),
                defs = {};

            if (routeKey) {
                var routeKeys = routeKey ? routeKey.split('||') : [];
                var routeTargets = routeTarget ? routeTarget.split('||'): [];
                can.each(routeKeys, function (item, index) {
                    defs[item] = routeTargets[index] || null;
                })
                //path is same as target when path not explicitly passed
                // if (typeof routePath === 'undefined') {
                //     routePath = routeTargets[0];
                //     scope.attr('routePath', routePath);
                // }
            }
            //set up route
            can.route(routePath, defs);
        }
    }
});
