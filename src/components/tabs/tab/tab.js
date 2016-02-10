import can from 'can';
import 'can/view/stache/stache';
import template from './tab.stache!';
import viewmodel from './viewmodel';
import './tab.less!';

can.Component.extend({
    tag: 'ma-tab',
    template: template,
    scope: viewmodel,
    events: {
        inserted: function () {
            //register with tabs
            var tabsVM = can.viewModel(this.element.parents('ma-tabs'));
            tabsVM.register(this.viewModel);
        }
    }
});
