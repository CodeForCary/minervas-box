import can from 'can';
import 'can/view/stache/stache';
import template from './tab.stache!';
import ViewModel from './viewmodel';
import './tab.less!';

can.Component.extend({
    tag: 'ma-tab',
    template,
    viewModel: ViewModel,
    events: {
        inserted: () => {
            //register with tabs
            const tabsVM = can.viewModel(this.element.parents('ma-tabs'));
            tabsVM.register(this.viewModel);
        },
        removed: () => {
            const tabsVM = can.viewModel(this.element.parents('ma-tabs'));
            tabsVM.unregister(this.viewModel);
        }
    }
});
