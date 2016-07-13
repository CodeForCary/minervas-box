import {Parent} from 'utils/parent-child-component';

export default Parent.extend({
    toggleTab: ctx => {
        this.attr('activeItem', ctx);
    }
});
