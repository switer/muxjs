'use strict';

var Message = require('./message')
var expect = require('./expect')
var keypath = require('./keypath')
var info = require('./info')
var util = require('./util')


function Mux () {}

Mux.extend = function(options) {
    return MuxFactor(options)
}

function MuxFactor(options) {

    var getter = options.props
    getter && expect.type(getter, 'function')

    var Ctor = function(receiveProps) {
        var emitter = new Message()
        var model = this
        var defOptions = {}
        var initialProps = getter ? getter() : {}
        var props = {}
        var keys = Object.keys(initialProps)
        var observeProps = keys

        keys.forEach(function(prop) {
            props[prop] = initialProps[prop]
            defOptions[prop] = {
                enumerable: true,
                get: function() {
                    return props[prop]
                }
            }
        })
        Object.defineProperties(model, defOptions)
        /**
         *  Instance receive props is a shorcut way of $set(props)
         */
        

        /**
         *  $set key-value pair
         */
        function _$sync(kp, value) {
            var parts = keypath.normalize(kp)
            var prop = parts.split('.')[0]

            if (!~observeProps.indexOf(prop)) {
                info.warn('Property "' + prop + '" is not observerable')
                return false
            }

            var preValue = props[prop]
            keypath.set(props, kp, value)
            var nextValue = props[prop]

            /**
             *  return previous/next values for another compare logic
             */
            return {
                next: nextValue,
                pre: preValue
            }
        }

        /**
         *  sync props value and trigger change event
         */
        function _$set (kp, value) {
            var diff = _$sync(kp, value)
            if (!diff) return

            /**
             *  Base type change of object type will be trigger change event
             */
            if (diff.next !== diff.pre || diff.next instanceof Object) {
                emitter.emit('change:' + kp, diff.next, diff.pre)
                // emit those wildcard callbacks
                emitter.emit('*')
            }
        }
        /**
         *  sync props's value in batch and trigger change event
         */
        function _$setMulti (keyMap) {
            var pubs = []
            var hasDiff = false
            var diff

            for (var key in keyMap) {
                if (keyMap.hasOwnProperty(key)) {
                    diff = _$sync(key, keyMap[key])

                    if (!diff) continue
                    if (diff.next !== diff.pre || diff.next instanceof Object) {
                        pubs.push(['change:' + key, diff.next, diff.pre])
                        hasDiff = true
                    }
                }
            }
            // emit in batch
            pubs.forEach(function(args) {
                emitter.emit.apply(emitter, args)
            })
            // emit those wildcard callbacks
            hasDiff && emitter.emit('*')
        }

        /**
         *  $add key-value pair
         */
        function _$add(prop) {
            expect(!prop.match(/[\.\[\]]/), 'Propname shoud not has "." or "[" or "]"')
            observeProps.push(prop)
            Object.defineProperty(model, prop, {
                enumerable: true,
                writable: false,
                get: function() {
                    return props[prop]
                }
            })
        }

        Object.defineProperties(model, {
            "$add": {
                enumerable: false,
                value: function(prop) {
                    if (util.type(prop) == 'string') {
                        _$add(prop)
                    } else if (util.type(prop) == 'object') {
                        for (var key in prop) {
                            if (prop.hasOwnProperty(key)) {
                                _$add(key, prop[key])
                            }
                        }
                    }
                }
            },
            "$set": {
                enumerable: false,
                value: function( /*[kp, value] | [kpMap]*/ ) {
                    var len = arguments.length
                    if (len >= 2) {
                        _$set(arguments[0], arguments[1])
                    } else if (len == 1) {
                        _$setMulti(arguments[0])
                    }
                }
            },
            "$watch": {
                enumerable: false,
                value: function( /*[key, ]callback*/ ) {
                    var len = arguments.length
                    var key, callback

                    if (len >= 2) {
                        key = 'change:' + arguments[0]
                        callback = arguments[1]
                    } else if (len == 1) {
                        key = '*'
                        callback = arguments[0]
                    }
                    emitter.on(key, callback)

                    var that = this
                    return function () {
                        that.$unwatch
                    }
                }
            },
            "$unwatch": {
                enumerable: false,
                value: function( /*key, callback*/ ) {
                    var len = arguments.length
                    var key, callback

                    if (len >= 2) {
                        key = 'change:' + arguments[0]
                        emitter.off(key, arguments[1])
                    } else if (len == 1){
                        emitter.off('*', arguments[0])
                    } else {
                        emitter.off('*')
                    }
                }
            }
        })
        /**
         *  A shortcut for $set(props) while instancing 
         */
        _$setMulti(receiveProps)

    }
    return Ctor
}

function NOOP() {}

module.exports = Mux
