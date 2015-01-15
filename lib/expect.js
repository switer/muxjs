'use strict';

var util = require('./util')

function expect (bool, msg) {
    if (!bool) throw new Error(msg || 'Unexpect error')
}
expect.type = function(obj, type, msg) {
    if (util.type(obj) != type) throw new Error(msg || 'Expect param\'s type be' + type + ' not ' + util.type(obj))
},
expect.exist = function(obj, msg) {
    if (obj == undefined) throw new Error(msg || 'Expect param not be undefined')
}
module.exports = expect