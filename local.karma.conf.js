module.exports = function(config) {
    config.set({
        logLevel: 'LOG_DEBUG', // 1

        reporters: ['spec'], // 2

        singleRun: true, // 3
        autoWatch: false,

        frameworks: [ // 4
            'mocha',
            'browserify'
        ],

        files: [ // 5
            'test/index.js'
        ],

        preprocessors: { // 6
            'test/index.js': ['browserify']
        },

        browserify: { // 7
            debug: true
        },

        browsers: ['chrome'] // 8

    });
};
