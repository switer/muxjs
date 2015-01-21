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
    
    var typeOfType = util.type(type)
    var typeOfObj = util.type(obj)

    if (typeOfType == 'string') {
        if (typeOfObj != type) throw new Error(msg || 'Expect param\'s type be ' + type + ' not ' + typeOfObj)
    } else if (typeOfType == 'array') {
        if (!type.some(function(t) {
            if (typeOfObj == t) return true
        })) throw new Error(msg || 'Unexpect param\'s type ' + typeOfObj + ', it should one of ' + type.join(','))
    }
}
module.exports = expect
