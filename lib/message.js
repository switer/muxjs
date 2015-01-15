/**
 *  Simple Pub/Sub module
 *  @author switer <guankaishe@gmail.com>
 **/
'use strict';

function Message() {
    this._observers = {}
}
Message.prototype.on = function(sub, cb) {
    _patch(this._observers, sub, [])

    this._observers[sub].push({
        cb: cb
    })
}
Message.prototype.off = function(sub, cb) {
    var types

    if (sub) types = [sub]
    else types = Object.keys(this._observers)

    types.forEach(function(sub) {

        var obs = this._observers[sub]
        if (!obs) return

        var nextObs = new Array(obs.length)
        obs.forEach(function(observer) {
            if (observer.cb !== cb) {
                nextObs.push(observer)
            }
        });
        this._observers[sub] = nextObs

    }.bind(this));

    return this;
}
Message.prototype.emit = function(sub, data) {
    var obs = this._observers[sub]
    if (!obs) return

    obs.forEach(function(item) {
        item.cb && item.cb(data)
    });
}

/**
 *  Util methods
 */
function _patch (obj, prop, defValue) {
    !obj[prop] && (obj[prop] = defValue)
}

/**
 *  Global Message Central
 **/
var msg = new Message();
Message.on = function() {
    msg.on.apply(msg, arguments);
}
Message.off = function() {
    msg.off.apply(msg, arguments);
}
Message.emit = function() {
    msg.emit.apply(msg, arguments);
}

module.exports = Message;
