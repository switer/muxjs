var Mux = require('../dist/mux.min.js')
var assert = require('assert')
Mux.config({
    warn: false
})
require('./spec-global-api')(Mux, assert)
require('./spec-instance-method')(Mux, assert)
require('./spec-options')(Mux, assert)
require('./spec-options-deep')(Mux, assert)