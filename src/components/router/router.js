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
            
            //path is same as target when path not explicitly passed
            if (typeof routePath === 'undefined') {
                routePath = routeTarget;
                scope.attr('routePath', routePath);
            }
            
            //set up route
            defs[routeKey] = routeTarget;
            can.route(routePath, defs);
        }
    }
});
