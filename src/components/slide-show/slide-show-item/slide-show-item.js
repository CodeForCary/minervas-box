import can from 'can';
import 'can/view/stache/stache';
import template from './slide-show-item.stache!';
import ViewModel from './slide-show-item.vm';
import './slide-show-item.less!';

export default can.Component.extend({
    tag: 'ma-slide-show-item',
    template: template,
    viewModel: ViewModel,
    events: {
        inserted: function () {
            var slideShowVM = can.viewModel(this.element.parents('ma-slide-show'));
            slideShowVM.register(this.viewModel);
        },
        removed: function () {
            var slideShowVM = can.viewModel(this.element.parents('ma-slide-show'));
            slideShowVM.unregister(this.viewModel);
        }
    }
});
