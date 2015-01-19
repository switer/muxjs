'use strict';

module.exports = {
    type: function (obj) {
        return /\[object (\w+)\]/.exec(Object.prototype.toString.call(obj))[1].toLowerCase()
    },
    patch: function (obj, prop, defValue) {
        !obj[prop] && (obj[prop] = defValue)
    },
    diff: function (next, pre) {
        return next !== pre || next instanceof Object
    },
    merge: function (dest, source) {
        for (var key in source) {
            if (source.hasOwnProperty(key)) {
                dest[key] = source[key]
            }
        }
        return dest
    }
}