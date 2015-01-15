'use strict';

var Message = require('./message')
var expect = require('./expect')
var keypath = require('./keypath')
var info = require('./info')
var util = require('./util')


function Mux() {}

Mux.extend = function(options) {
    return MuxFactor(options)
}

function MuxFactor(options) {

    var getter = options.props
    getter && expect.type(getter, 'function')

    /**
     *  Mux's model constructor, could instance with "new" operator or call it directly.
     *  @param receiveProps <Object> initial props set to model which will no trigger change event.
     */
    var Ctor = function(receiveProps) {
        if (!(this instanceof Ctor)) return new Ctor(receiveProps)
        var emitter = new Message() // EventEmitter of this model
        var model = this
        var defOptions = {}
        var initialProps = getter ? getter.call(this) : {}
        var computedProps = options.computed || {}
        var initialKeys = Object.keys(initialProps)
        var computedKeys = Object.keys(computedProps)
        var observeProps = initialKeys.concat(computed)
        var _props = {} // all props

        /**
         *  Observe each prop of props that return from props function
         */
        initialKeys.forEach(function(prop) {
            _props[prop] = initialProps[prop]
            defOptions[prop] = {
                enumerable: true,
                get: function() {
                    return _props[prop]
                }
            }
        })

        computedKeys.forEach(function(key) {
            var prop = computedProps[key]
            if (util.type(prop.fn) != 'function') 
                info.warn('Computed property ' + key + '\'s "fn" should be a function')

            defOptions[key] = {
                enumerable: true,
                get: function() {
                    return (prop.fn || NOOP).call(model)
                }
            }
        })

        Object.defineProperties(model, defOptions)

        /**
         *  set key-value pair to private model's props store
         *  @param kp <String> keyPath
         *  @return <Object>
         */
        function _$sync(kp, value) {
            var parts = keypath.normalize(kp).split('.')
            var prop = parts[0]

            if (!~observeProps.indexOf(prop)) {
                info.warn('Property "' + prop + '" has not been observed')
                // return false means sync prop fail
                return false
            }

            var preValue = _props[prop]
            keypath.set(_props, kp, value)
            var nextValue = _props[prop]

            /**
             *  return previous and next value for another compare logic
             */
            return {
                next: nextValue,
                pre: preValue
            }
        }

        function _getComputedProps(deps, reducer) {
            var props = []
            computedKeys.forEach(function(key) {
                computedProp = computedProps[key]
                if (!computedProp.deps || !computedProp.deps.length) return
                if (deps.some(function(dep) {
                    return ~computedProp.deps.indexOf(dep)
                })) {
                    props.push(reducer ? reducer(key) : key)
                }
            })
            return props
        }

        /**
         *  sync props value and trigger change event
         *  @param kp <String> keyPath
         */
        function _$set(kp, value) {
            var willComputedProps = _getComputedProps([kp], function(key) {
                return [key, computedProps[key].fn.call(model)]
            })
            var diff = _$sync(kp, value)
            if (!diff) return

            /**
             *  Base type change of object type will be trigger change event
             */
            if (diff.next !== diff.pre || diff.next instanceof Object) {
                emitter.emit('change:' + kp, diff.next, diff.pre)
                // trigger computed change
                willComputedProps.forEach(function (prop) {
                    var prop = computedProps[key]
                    emitter.emit(key, props.fn.call(), )
                })

                _computedDeps([kp])
                // emit those wildcard callbacks
                emitter.emit('*')
            }
        }

        /**
         *  sync props's value in batch and trigger change event
         *  @param keyMap <Object> properties object
         */
        function _$setMulti(keyMap) {
            var pubs = []
            var hasDiff = false
            var diff

            for (var key in keyMap) {
                if (keyMap.hasOwnProperty(key)) {
                    diff = _$sync(key, keyMap[key])

                    if (!diff) continue
                        /**
                         *  if props is not congruent or diff is an object reference value
                         *  then emit change event
                         */
                    if (diff.next !== diff.pre || diff.next instanceof Object) {
                        // emit change immediately
                        emitter.emit('change:' + key, diff.next, diff.pre)
                        hasDiff = true
                    }
                }
            }
            // emit those wildcard callbacks
            hasDiff && emitter.emit('*')
        }

        /**
         *  create a prop observer
         *  @param prop <String> property name
         */
        function _$add(prop) {
            expect(!prop.match(/[\.\[\]]/), 'Unexpect propname ' + +', it shoudn\'t has "." and "[" and "]"')
            if (~observeProps.indexOf(prop)) return
            observeProps.push(prop)
            Object.defineProperty(model, prop, {
                enumerable: true,
                get: function() {
                    return _props[prop]
                }
            })
        }

        /**
         *  create observers for multiple props
         *  @param props <Array> properties name list
         */
        function _$addMulti(props) {
            var defOptions = {}
            props.forEach(function(prop) {
                expect(!prop.match(/[\.\[\]]/), 'Unexpect propname ' + +', it shoudn\'t has "." and "[" and "]"')
                // already exist in observers
                if (~observeProps.indexOf(prop)) return
                observeProps.push(prop)
                defOptions[prop] = {
                    enumerable: true,
                    get: function() {
                        return _props[prop]
                    }
                }
            })
            Object.defineProperties(model, defOptions)
        }

        /**
         *  define instantiation's methods
         */
        Object.defineProperties(model, {
            /**
             *  add prop/props to observers
             *  @param prop <String> | <Array>
             */
            "$add": {
                enumerable: false,
                value: function(prop) {
                    if (util.type(prop) == 'string') {
                        _$add(prop)
                    } else if (util.type(prop) == 'array') {
                        _$addMulti(prop)
                    }
                }
            },
            /**
             *  subscribe prop change
             *  change prop/props value, it will be trigger change event
             *  @param kp <String>
             *  @param kpMap <Object>
             */
            "$set": {
                enumerable: false,
                value: function( /*[kp, value] | [kpMap]*/ ) {
                    var len = arguments.length
                    if (len >= 2) {
                        _$set(arguments[0], arguments[1])
                    } else if (len == 1 && util.type(arguments[0]) == 'object') {
                        _$setMulti(arguments[0])
                    }

                    return this
                }
            },
            /**
             *  if params is (key, callback), add callback to key's subscription
             *  if params is (callback), subscribe any prop change events of this model
             *  @param key <String> optional
             *  @param callback <Function>
             */
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
                    var args = arguments
                        // return a unsubscribe method
                    return function() {
                        that.$unwatch.apply(that, args)
                    }
                }
            },
            /**
             *  unsubscribe prop change
             *  if params is (key, callback), remove callback from key's subscription
             *  if params is (callback), remove all callbacks from key' ubscription
             *  if params is empty, remove all callbacks of current model
             *  @param key <String>
             *  @param callback <Function>
             */
            "$unwatch": {
                enumerable: false,
                value: function( /*[key, ] [callback] */ ) {
                    var len = arguments.length
                    var key, callback

                    if (len >= 2) {
                        key = 'change:' + arguments[0]
                        emitter.off(key, arguments[1])
                    } else if (len == 1) {
                        emitter.off('*', arguments[0])
                    } else {
                        emitter.off('*')
                    }

                    return this
                }
            }
        })
        /**
         *  A shortcut of $set(props) while instancing
         */
        _$setMulti(receiveProps)

    }
    return Ctor
}

function NOOP() {}

module.exports = Mux
