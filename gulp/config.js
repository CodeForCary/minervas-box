const opts = {
    build: 'dist',
    src: './src',
    root: './'
};

module.exports = {
    build: {
        src: opts.src,
        destination: opts.build,
        bundles: '_dist'
    },
    server: {
        prod: {
            build: opts.build
        },
        dev: {
            build: opts.root
        }

    }
};
