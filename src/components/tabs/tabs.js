import can from 'can';
import 'can/view/stache/stache';
import template from './tabs.stache!';
import viewmodel from './viewmodel';
import './tabs.less!';

import './tab/tab';

can.Component.extend({
    tag: 'ma-tabs',
    template: template,
    scope: viewmodel,
    events: {
        inserted: function () {
            //activate default tab
            
        }
    }
});
