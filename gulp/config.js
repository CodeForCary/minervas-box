var opts = {
    build: 'dist',
    src: './src',
    root: './'
};

module.exports = {
    build: {
    },
    server: {
        prod: {
            build: opts.build
        },
        dev: {
            build: opts.root
        }

    },
    jshint: {
        src: opts.src + '/**/*.js'
    }
}
