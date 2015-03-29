'use strict';

var $util = require('./util')
var hookMethods = ['splice', 'push', 'pop', 'shift', 'unshift', 'reverse', 'sort', '$concat']
var _push = Array.prototype.push
var _slice = Array.prototype.slice
var attachMethods = {
    '$concat': function () {
        var args = _slice.call(arguments)
        var arr = this
        args.forEach(function (items) {
            $util.type(items) == 'array' 
                ? items.forEach(function (item) {
                        _push.call(arr, item)
                    })
                : _push.call(arr, items)
        })
        return arr
    }
}
var hookFlag ='__hook__'

module.exports = function (arr, hook) {
    hookMethods.forEach(function (m) {
        if (arr[m] && arr[m][hookFlag]) {
            // reset hook method
            arr[m][hookFlag](hook)
            return
        }
        // cached native method
        var nativeMethod = arr[m] || attachMethods[m]
        // method proxy
        $util.def(arr, m, {
            enumerable: false,
            value: function () {
                return hook(arr, m, nativeMethod, arguments)
            }
        })
        // flag mark
        $util.def(arr[m], hookFlag, {
            enumerable: false,
            value: function (h) {
                hook = h
            }
        })
    })
}