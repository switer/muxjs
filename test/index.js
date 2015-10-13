var Mux = require('../index')
var assert = require('assert')
Mux.config({
    warn: false
})
require('./spec-base')(Mux, assert)
require('./spec-global-api')(Mux, assert)
require('./spec-instance-method')(Mux, assert)
require('./spec-instance-array')(Mux, assert)
require('./spec-options')(Mux, assert)
require('./spec-options-deep')(Mux, assert)