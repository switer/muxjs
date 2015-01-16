'use strict';

var _enable = true

module.exports = {
    enable: function () {
        _enable = true
    },
    disable: function () {
        _enable = false
    },
    warn: function (msg) {
        if (!_enable) return
        if (console.warn) return console.warn(msg)
        console.log(msg)
    }
}