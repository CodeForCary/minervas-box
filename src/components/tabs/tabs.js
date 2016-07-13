import can from 'can';
import 'can/view/stache/stache';
import template from './tabs.stache!';
import ViewModel from './viewmodel';
import './tabs.less!';

import './tab/tab';

can.Component.extend({
    tag: 'ma-tabs',
    template,
    viewModel: ViewModel,
    events: {
        inserted: () => {
            //TODO: activate default tab

        }
    }
});
