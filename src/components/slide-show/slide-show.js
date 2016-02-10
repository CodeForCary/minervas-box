import can from 'can';
import 'can/view/stache/stache';
import template from './slide-show.stache!';
import viewmodel from './viewmodel';
import {inRangeArray} from 'utils/isInRange';

export default can.Component.extend({
    tag: 'ma-slide-show',
    template: template,
    scope: viewmodel,
    events: {
        '{items} change': function(ctx, ev, index, eventName, item) {
            if (index === '0') {
                var ctx = can.isArray(item) ? item[0] : item;
                this.viewModel.toggleItem(ctx);
            }
        },
        '{viewModel} activeItem': function (ctx, key, nextItem) {
            // update the next and previous items using the index
            if (nextItem) {
                var vm = this.viewModel;
                var items = vm.attr('items');
                var index = items.indexOf(nextItem);
                if (index > -1) {
                    var prevIndex = inRangeArray(items, index - 1) === 'IN_RANGE' ? index - 1: items.length -1;
                    var nextIndex = inRangeArray(items, index + 1) === 'IN_RANGE' ? index + 1: 0;

                    vm.attr('previousSlide', items.attr(prevIndex));
                    vm.attr('nextSlide', items.attr(nextIndex));
                }
            }


        }
    }
});
