/*eslint quote-props: 0 */
import can from 'can';
import 'can/view/stache/stache';
import template from './flag-image.stache!';
import Viewmodel from './flag-image.viewmodel';
import './flag-image.less!';

export default can.Component.extend({
    tag: 'ma-flag-image',
    template,
    viewModel: Viewmodel,
    events: {
        inserted: 'getDimensions',
        '{viewModel} flagSrc': 'getDimensions',
        getDimensions: () => {
            const width = this.element.find('.city-flag-image').width();
            const height = this.element.find('.city-flag-image').height();
            this.viewModel.attr('dimensions', {ht: height, wt: width});
        }
    }
});
