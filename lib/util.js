'use strict';

module.exports = {
    type: function (obj) {
        return /\[object (\w+)\]/.exec(Object.prototype.toString.call(obj))[1].toLowerCase()
    },
    objEach: function (obj, fn) {
        for(var key in obj) {
            if (obj.hasOwnProperty(key)) {
                fn(key, obj[key])
            }
        }
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
    },
    copyArray: function (arr) {
        var len = arr.length
        var nArr = new Array(len)
        while(len --) {
            nArr[len] = arr[len]
        }
        return nArr
    },
    copyObject: function () {
        var cObj = {}
        this.objEach(function (k, v) {
            cObj[k] = v
        })
        return cObj
    }
}