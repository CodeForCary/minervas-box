import can from 'can';
import 'can/view/stache/stache';
import template from './router.stache!';
import ViewModel from './viewmodel';

can.Component.extend({
    tag: 'ma-router',
    template,
    viewModel: ViewModel,
    events: {
        inserted: () => {
            const vm = this.viewModel;
            const routeKey = vm.attr('routeKey');
            const routePath = vm.attr('routePath');
            const routeTarget = vm.attr('routeTarget');
            const defs = {};

            if (routeKey) {
                const routeKeys = routeKey ? routeKey.split('||') : [];
                const routeTargets = routeTarget ? routeTarget.split('||') : [];
                can.each(routeKeys, (item, index) => {
                    defs[item] = routeTargets[index] || null;
                });
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
