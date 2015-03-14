import can from 'canjs';
import 'canjs/stache';
import template from './artwork.stache!';
import viewmodel from './viewmodel';

import 'components/art-photo/art-photo';

can.Component.extend({
    tag: 'mp-artwork',
    template: template,
    scope: viewmodel
});
