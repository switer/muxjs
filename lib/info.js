'use strict';


module.exports = {
    warn: function (msg) {
        if (console.warn) console.warn(msg)
        console.log(msg)
    }
}