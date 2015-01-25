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
    copyObject: function (obj) {
        var cObj = {}
        this.objEach(obj, function (k, v) {
            cObj[k] = v
        })
        return cObj
    },
    copyValue: function (v) {
        var t = this.type(v)
        switch(t) {
            case 'object': return this.copyObject(v)
            case 'array': return this.copyArray(v)
            default: return v
        }
    },
    insertProto: function (obj, proto) {
        var end = obj.__proto__
        obj.__proto__ = proto
        obj.__proto__.__proto__ = end
    }
}