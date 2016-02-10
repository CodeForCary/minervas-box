import can from 'can';
import 'can/map/define/define';
import {Parent, Child} from 'utils/parentChildComponent.utils';

export default Parent.extend({
    define: {
        previousSlide: {
            Type: Child
        },
        nextSlide: {
            Type: Child
        },
        carouselId: {
            value: ''
        }
    },
    openPrevious: function () {
        this.attr('activeItem', this.attr('previousSlide'));
    },
    openNext: function () {
        this.attr('activeItem', this.attr('nextSlide'));
    },
    goToThisSlide: function (ctx) {
        this.attr('activeItem', ctx);
    }
});
