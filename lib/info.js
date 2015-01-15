'use strict';


module.exports = {
    warn: function (msg) {
        if (console.warn) return console.warn(msg)
        console.log(msg)
    }
}