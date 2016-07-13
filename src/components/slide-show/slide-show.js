import can from 'can';
import 'can/view/stache/stache';
import {inRangeArray} from 'utils/is-in-range';
import template from './slide-show.stache!';
import ViewModel from './viewmodel';

export default can.Component.extend({
    tag: 'ma-slide-show',
    template,
    viewModel: ViewModel,
    events: {
        '{items} change': (ctx, ev, index, eventName, item) => {
            if (index === '0') {
                const ctx = can.isArray(item) ? item[0] : item;
                this.viewModel.toggleItem(ctx);
            }
        },
        '{viewModel} activeItem': (ctx, key, nextItem) => {
            // update the next and previous items using the index
            if (nextItem) {
                const vm = this.viewModel;
                const items = vm.attr('items');
                const index = items.indexOf(nextItem);
                if (index > -1) {
                    const prevIndex = inRangeArray(items, index - 1) === 'IN_RANGE' ? index - 1 : items.length - 1;
                    const nextIndex = inRangeArray(items, index + 1) === 'IN_RANGE' ? index + 1 : 0;

                    vm.attr('previousSlide', items.attr(prevIndex));
                    vm.attr('nextSlide', items.attr(nextIndex));
                }
            }
        }
    }
});
