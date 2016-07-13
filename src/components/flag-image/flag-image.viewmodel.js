import can from 'can';
import 'can/map/define/define';

const defaultSize = [100, 65];

export default can.Map.extend({
    define: {
        flagSrc: {
            type: 'string',
            value: ''
        },
        flagPosition: {
            type: 'string',
            value: 'center'
        },
        dimensions: {
            set: dims => {
                const resized = {
                    ht: 0,
                    wt: 0
                };
                const ratio = dims.wt / dims.ht;
                if (ratio > 1) {
                    resized.wt = defaultSize[0];
                    resized.ht = Math.round(resized.wt / ratio);
                }
                if (ratio < 1) {
                    resized.ht = defaultSize[1];
                    resized.wt = Math.round(resized.ht * ratio);
                }
                if (ratio !== 1 && resized.ht !== 0 && resized.wt !== 0) {
                    this.attr('resizedDimensions', resized);
                }

                return dims;
            }
        },
        resizedDimensions: {
            Value: Object
        }
    }
});
