import can from 'can';
import 'can/view/stache/stache';
import Artwork from 'models/artwork/artwork';
import ViewModel from './artwork-detail.viewmodel';
import template from './artwork-detail.stache!';
import 'components/art-photo/art-photo';

can.Component.extend({
    tag: 'mp-artwork-detail',
    template,
    viewModel: ViewModel,
    events: {
        inserted: () => {
            const scope = this.scope;

            Artwork.findAll({}).then(resp => {
                scope.attr('artList', resp);
            });
        }
    }
});
