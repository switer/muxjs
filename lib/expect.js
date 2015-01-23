'use strict';

var util = require('./util')

/**
 *  Expect condition is truely
 *  @param cnd <Boolean>
 *  @param msg <String> *optional*
 */
function expect(cnd, msg) {
    if (!cnd) throw new Error(msg || 'Unexpect error')
}

/**
 *  Expect obj should be type of/in "type"
 *  @param obj
 *  @param type <String> | <Array>
 *  @param msg <String> *optional*
 */
expect.type = function(obj, type, msg) {
    var tot = util.type(type) // type of "type"
    var too = util.type(obj) // type of "obj"
    if (tot == 'string') {
        if (too != type) throw new Error(msg || 'Expect param\'s type be ' + type + ' not ' + too)
    } else if (tot == 'array') {
        if (!type.some(function(t) {
            if (too == t) return true
        })) throw new Error(msg || 'Unexpect param\'s type ' + too + ', it should one of ' + type.join(','))
    }
}
module.exports = expect
