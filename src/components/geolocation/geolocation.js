import can from 'can';
import 'can/view/stache/stache';
import template from './geolocation.stache!';
import viewmodel from './viewmodel';

can.Component.extend({
    tag: 'bit-geolocation',
    template: template,
    scope: viewmodel,
    events: {
      inserted: function () {
        var vm = this.viewModel,
          GeoModel = vm.attr('Geolocation');
        GeoModel.findOne({}).then(function (loc) {

            vm.attr('location', loc);
            console.log(loc);

          });
      }
    }
});
