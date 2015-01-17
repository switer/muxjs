module.exports = function(config) {
    config.set({
        logLevel: 'LOG_DEBUG',
        reporters: ['spec'],
        singleRun: true,
        autoWatch: false,
        frameworks: [
            'mocha',
            'browserify'
        ],
        files: [
            'test/index.js'
        ],
        preprocessors: {
            'test/index.js': ['browserify']
        },
        browserify: {
            debug: true
        },
        browsers: ['chrome']
    });
};
