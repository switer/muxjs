/**
 *  Simple Pub/Sub module
 *  @author switer <guankaishe@gmail.com>
 **/
'use strict';

var $util = require('./util')
var _patch = $util.patch
var _type = $util.type
var _scopeDefault = '__default_scope__'

function Message(context) {
    this._observers = {}
    this._context = context
}

Message.prototype.on = function(sub, cb, scope) {
    scope = scope || _scopeDefault
    _patch(this._observers, sub, [])

    this._observers[sub].push({
        cb: cb,
        scope: scope
    })
}

/**
 *  @param subject <String> subscribe type
 *  @param [cb] <Function> callback, Optional, if callback is not exist, 
 *      will remove all callback of that sub 
 */
Message.prototype.off = function(/*subject, cb, scope*/) {
    var types
    var args = arguments
    var len = args.length
    var cb, scope

    if (len >= 3) {
        // clear all observers of this subject and callback eq "cb"
        types = [args[0]]
        cb = args[1]
        scope = args[2]

    } else if (len == 2 && _type(args[0]) == 'function') {
        // clear all observers those callback equal "cb"
        types = Object.keys(this._observers)
        cb = args[0]
        scope = args[1]

    } else if (len == 2) {
        // clear all observers of this subject
        types = [args[0]]
        scope = args[1]
    } else if (len == 1){
        // clear all observes of the scope
        types = Object.keys(this._observers)
        scope = args[0]
    } else {
        // clear all observes
        this._observers = []
        return this
    }

    scope = scope || _scopeDefault

    var that = this
    types.forEach(function(sub) {

        var obs = that._observers[sub]
        if (!obs) return
        var nextObs = []
        if (cb) {
            obs.forEach(function(observer) {
                if (observer.cb === cb && observer.scope === scope) {
                    return
                }
                nextObs.push(observer)
            })
        } else {
            obs.forEach(function (observer) {
                if (observer.scope === scope) return
                nextObs.push(observer)
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

module.exports = Message
