var opts = {
    build: 'dist',
    src: './src'
};

module.exports = {
    build: {
    },
    server: {
        prod: {
            build: opts.build
        },
        dev: {
            build: opts.src
        }
        
    },
    jshint: {
        src: opts.src + '/**/*.js'
    }
}
