import can from 'can';
import 'can/view/stache/stache';
import template from './slide-show.stache!';
import viewmodel from './viewmodel';

import from 'bootstrap/carousel'

can.Component.extend({
    tag: 'ma-slide-show',
    template: template,
    scope: viewmodel,
    events: {
        inserted: function() {
            var carouselId = this.scope.attr('carouselId');
            
            $( '#' + carouselId ).carousel();
        }
    }
});
