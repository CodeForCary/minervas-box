/*eslint quote-props: 0 */
import can from 'can';
import 'can/view/stache/stache';
import viewmodel from './marker.viewmodel';

can.Component.extend({
    tag: 'bit-map-marker',
    viewModel: viewmodel,
    events: {
        inserted: 'addMarker',
        '{viewModel} map': 'addMarker',
        addMarker: () => {
            this.viewModel.addMarker();
        }
    }
});
