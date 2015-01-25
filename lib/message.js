/**
 *  Simple Pub/Sub module
 *  @author switer <guankaishe@gmail.com>
 **/
'use strict';

var $util = require('./util')
var _patch = $util.patch
var _type = $util.type

function Message(context) {
    this._observers = {}
    this._context = context
}

Message.prototype.on = function(sub, cb) {
    _patch(this._observers, sub, [])

    this._observers[sub].push({
        cb: cb
    })
}

/**
 *  @param subject <String> subscribe type
 *  @param [cb] <Function> callback, Optional, if callback is not exist, 
 *      will remove all callback of that sub 
 */
Message.prototype.off = function(subject, cb) {
    var types

    var len = arguments.length
    if (len >= 2) {
        // clear all observers of this subject and callback eq "cb"
        types = [subject]
    } else if (len == 1 && _type(arguments[0]) == 'function') {
        // clear all observers those callback equal "cb"
        cb = arguments[0]
        types = Object.keys(this._observers)
    } else if (len == 1) {
        // clear all observers of this subject
        types = [subject]
    } else {
        // clear all
        this._observers = []
        return this
    }

    var that = this
    types.forEach(function(sub) {

        var obs = that._observers[sub]
        if (!obs) return

        var nextObs = []
        if (cb) {
            obs.forEach(function(observer) {
                if (observer.cb !== cb) {
                    nextObs.push(observer)
                }
            })
        }
        // if cb is not exist, clean all observers
        that._observers[sub] = nextObs

    })

    return this
}
Message.prototype.emit = function(sub) {
    var obs = this._observers[sub]
    if (!obs) return
    var args = [].slice.call(arguments)
    args.shift()
    var that = this
    obs.forEach(function(item) {
        item.cb && item.cb.apply(that._context || null, args)
    })
}

/**
 *  Global Message Central
 **/
var msg = new Message()
Message.on = function() {
    msg.on.apply(msg, arguments)
}
Message.off = function() {
    msg.off.apply(msg, arguments)
}
Message.emit = function() {
    msg.emit.apply(msg, arguments)
}

module.exports = Message
