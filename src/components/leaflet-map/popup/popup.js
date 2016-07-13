/*eslint quote-props: 0 */
import can from 'can';
import 'can/view/stache/stache';
import ViewModel from './popup.viewmodel';

can.Component.extend({
    tag: 'bit-map-popover',
    viewModel: ViewModel,
    events: {
        inserted: 'addPopup',
        '{viewModel} map': 'addPopup',
        addPopup: () => {
            this.viewModel.addPopup();
        }
    }
});
