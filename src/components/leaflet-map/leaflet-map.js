/*eslint quote-props: 0 */
import can from 'can';
import 'can/view/stache/stache';
import template from './leaflet-map.stache!';
import viewmodel from './leaflet-map.viewmodel';
import './leaflet-map.less!';

can.Component.extend({
    tag: 'bit-leaflet-map',
    template,
    viewModel: viewmodel,
    events: {
        inserted: 'initMap',
        '{viewModel} geo': 'initMap',
        initMap: () => {
            const vm = this.viewModel;
            const geo = vm.attr('geo');
            if (geo && !can.isEmptyObject(geo.attr())) {
                vm.initMap();
            }
        }
    }
});
