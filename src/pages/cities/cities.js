import can from 'can';
import 'can/view/stache/stache';
import template from './cities.stache!';
import viewmodel from './cities.viewmodel';

can.Component.extend({
    tag: 'mp-cities',
    template: template,
    scope: viewmodel,
    events: {
        inserted: function () {
            var self = this,
                def = self.viewModel().City.findAll({});
            
            def.then(function (resp) {
                self.attr('cities', resp);
            });
        }
    }
});
