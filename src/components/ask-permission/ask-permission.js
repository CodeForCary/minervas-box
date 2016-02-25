import can from 'can';
import 'can/view/stache/stache';
import ViewModel from './ask-permission.viewmodel';

can.Component.extend({
    tag: 'ma-ask-permission',
    viewModel: ViewModel
});
