import can from 'can';
import 'can/view/stache/stache';
import template from './cities.stache!';
import viewmodel from './cities.viewmodel';
import './cities.less!';

import 'components/geolocation/geolocation';

can.Component.extend({
    tag: 'mp-cities',
    template: template,
    scope: viewmodel,
    events: {
        inserted: function () {
            var vm = this.viewModel,
                def = vm.City.findAll({});
            def.then(function (resp) {
                vm.attr('cities', resp);
            });
        }
    }
});
