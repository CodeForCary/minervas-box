import can from 'can';
import 'can/view/stache/stache';
import ViewModel from './ask-permission.viewmodel';
import template from './ask-permission.stache!';

can.Component.extend({
    tag: 'ma-ask-permission',
    template: template,
    viewModel: ViewModel
});
