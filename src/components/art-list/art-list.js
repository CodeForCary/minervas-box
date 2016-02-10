import can from 'can';
import 'can/view/stache/stache';
import template from './art-list.stache!';
import ViewModel from './viewmodel';
import './art-list.less!';


import 'components/slide-show/slide-show';
import 'components/slide-show/slide-show-item/slide-show-item';

can.Component.extend({
    tag: 'ma-art-list',
    template: template,
    viewModel: ViewModel
});
