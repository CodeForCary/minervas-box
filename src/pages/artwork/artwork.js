import can from 'can';
import 'can/view/stache/stache';
import template from './artwork.stache!';
import viewmodel from './viewmodel';

import 'components/art-photo/art-photo';

can.Component.extend({
    tag: 'mp-artwork',
    template: template,
    scope: viewmodel
});
