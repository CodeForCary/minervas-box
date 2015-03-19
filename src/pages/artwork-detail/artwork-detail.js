import can from 'can';
import 'can/view/stache/stache';
import template from './artwork-detail.stache!';
import viewmodel from './artwork-detail.viewmodel';

import Artwork from 'models/artwork/artwork'

import 'components/art-photo/art-photo';

can.Component.extend({
    tag: 'mp-artwork-detail',
    template: template,
    scope: viewmodel,
    events: {
        inserted: function () {
            var scope = this.scope;
            
            var def = Artwork.findAll({}).then(function (resp) {
                scope.attr('artList', resp);
            });
            
        }
    }
});
