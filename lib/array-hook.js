'use strict';

var hookMethods = ['splice', 'push', 'pop', 'shift', 'unshift']
var hookFlag ='__hook__'
module.exports = function (arr, hook) {
    hookMethods.forEach(function (m) {
        if (arr[m][hookFlag]) return
        // cached native method
        var nativeMethod = arr[m]
        // method proxy
        arr[m] = function () {
            return hook(m, nativeMethod, arguments)
        }
        // flag mark
        Object.defineProperty(arr[m], hookFlag, {
            enumerable: false,
            value: true
        })
    })
}