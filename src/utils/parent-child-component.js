import can from 'can';
import 'can/map/define/define';

const utils = {
    buildId: title => {
        return can.underscore(title).toLowerCase();
    }
};

const Child = can.Map.extend({
    define: {
        itemTitle: {
            value: '',
            type: 'string'
        },
        itemId: {
            get: () => {
                // process item-title to item-id
                return this.attr('itemId') || utils.buildId(this.attr('itemTitle'));
            }
        }
    },

    isDisabled: ctx => {
        return ctx.attr('disabled') || false;
    }
});

const Parent = can.Map.extend({
    define: {
        items: {
            value: []
        },
        activeItem: {
            value: Child
        },
        defaultItem: {
            value: '',
            type: 'string'
        }
    },
    isActive: ctx => {
        //TODO Somewhere, we are storing the wrong thing for this to work
        return ctx === this.attr('activeItem') || ctx === this.attr('activeItem.item');
    },
    register: childVM => {
        this.attr('items').push(childVM);

        //if registering the default, make the default the active item
        if (childVM.attr('itemTitle') === this.attr('defaultItem')) {
            this.toggleItem(childVM);
        }
    },
    unregister: childVM => {
        const items = this.attr('items');
        items.splice(items.indexOf(childVM), 1);
        if (items.length > 0) {
            this.toggleItem(items.attr(0));
        }
    },
    toggleItem: ctx => {
        this.attr('activeItem', ctx);
    }
});
export {Child};
export {Parent};
