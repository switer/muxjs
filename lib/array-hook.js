'use strict';

var $util = require('./util')
var hookMethods = ['splice', 'push', 'pop', 'shift', 'unshift', 'reverse', 'sort']
var hookFlag ='__hook__'

module.exports = function (arr, hook) {
    hookMethods.forEach(function (m) {
        if (arr[m][hookFlag]) {
            // reset hook method
            arr[m][hookFlag](hook)
            return
        }
        // cached native method
        var nativeMethod = arr[m]
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