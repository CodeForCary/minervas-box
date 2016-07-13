import can from 'can';
import 'can/view/stache/stache';
import template from './near-me.stache!';
import ViewModel from './near-me.viewmodel';

can.Component.extend({
    tag: 'mp-near-me',
    template,
    viewModel: ViewModel
});
