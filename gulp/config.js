var opts = {
    build: './build',
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
