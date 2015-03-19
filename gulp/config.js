var opts = {
    build: './dist',
    src: './'
};

module.exports = {
    build: {
        src: opts.src,
        build: opts.build
    },
    server: {
        prod: {
            build: opts.build
        },
        dev: {
            build: opts.src
        }
        
    }
}
