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
        var _initialProps = getter ? getter.call(this) : {}
        var _computedProps = options.computed || {}
        var _initialKeys = Object.keys(_initialProps)
        var _computedKeys = Object.keys(_computedProps)
        var _observeProps = _initialKeys.concat(_computedKeys)
        var _props = {} // all props
        var _computedDepsMapping = {} // mapping: deps --> props

        /**
         *  get dependence to computed props mapping
         *  O(n*n)
         */
        _computedKeys.forEach(function (ck) {
            var deps = _computedProps[ck].deps
            if (!deps) return
            deps.forEach(function (dep) {
                util.patch(_computedDepsMapping, dep, [])
                if (~_computedDepsMapping[dep].indexOf(ck)) return
                _computedDepsMapping[dep].push(ck)
            })
        })

        /**
         *  Observe each prop of props that return from props function
         */
        _initialKeys.forEach(function(prop) {
            _props[prop] = _initialProps[prop]
            defOptions[prop] = {
                enumerable: true,
                get: function() {
                    return _props[prop]
                }
            }
        })

        _computedKeys.forEach(function(key) {
            var prop = _computedProps[key]
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
        function _$sync(kp, value, syncHook) {
            var parts = keypath.normalize(kp).split('.')
            var prop = parts[0]

            if (!~_observeProps.indexOf(prop)) {
                info.warn('Property "' + prop + '" has not been observed')
                // return false means sync prop fail
                return false
            }

            var preValue = _props[prop]
            // here for geting computed value before change
            syncHook && syncHook()
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

        function _getComputedProps(deps, transform) {
            var props = []
            /**
             *  O(n*n)
             */
            _computedKeys.forEach(function(key) {
                computedProp = _computedProps[key]
                if (!computedProp.deps || !computedProp.deps.length) return
                if (deps.some(function(dep) {
                    return ~computedProp.deps.indexOf(dep)
                })) {
                    props.push(transform ? transform(key) : key)
                }
            })
            return props
        }

        /**
         *  sync props value and trigger change event
         *  @param kp <String> keyPath
         */
        function _$set(kp, value) {
            /**
             *  Here to get _computedProps due to get previous value before dependencies change
             *  Sorry, for the performance we can't offer next and previous value after prop change
             */
            // var willComputedProps = (_computedDepsMapping[kp] || []).map(function (ck) {
            //     return [ck, model[ck]] // 0: computed propname, 1: computed value
            // })

            var diff = _$sync(kp, value)
            if (!diff) return

            /**
             *  Base type change of object type will be trigger change event
             */
            if (diff.next !== diff.pre || diff.next instanceof Object) {
                emitter.emit('change:' + kp, diff.next, diff.pre)
                // trigger computed change
                ;(_computedDepsMapping[kp] || []).forEach(function (ck) {
                    emitter.emit('change:'+ ck)
                })
                // emit those wildcard callbacks
                emitter.emit('*')
            }
        }

        /**
         *  sync props's value in batch and trigger change event
         *  @param keyMap <Object> properties object
         */
        function _$setMulti(keyMap) {
            if (!keyMap || util.type(keyMap) != 'object') return
            var pubs = []
            var hasDiff = false
            var diff
            var deps = Object.keys(keyMap)
            var willComputedProps = []
            /**
             *  O(n*n)
             *  for the performance we can't offer next and previous value after prop change
             */
            // deps.forEach(function (dep) {
            //     _computedDepsMapping[dep].forEach(function (ck) {
            //         if (!willComputedPropsValues.hasOwnProperty(ck)) {
            //             willComputedPropsValues[ck] = _computedProps[ck].fn.call(model)
            //         }
            //     })
            // })
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
                        // for batch emit, if deps has multiple change in once, only trigger one times 
                        ;(_computedDepsMapping[key] || []).reduce(function (pv, cv, index) {
                            if (!~pv.indexOf(cv)) pv.push(cv)
                            return pv
                        }, willComputedProps)
                        hasDiff = true
                    }
                }
            }
            willComputedProps.forEach(function (ck) {
                emitter.emit('change:' + ck)
            })
            // emit those wildcard callbacks
            hasDiff && emitter.emit('*')
        }

        /**
         *  create a prop observer
         *  @param prop <String> property name
         */
        function _$add(prop) {
            expect(!prop.match(/[\.\[\]]/), 'Unexpect propname ' + +', it shoudn\'t has "." and "[" and "]"')
            if (~_observeProps.indexOf(prop)) return
            _observeProps.push(prop)
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
                if (~_observeProps.indexOf(prop)) return
                _observeProps.push(prop)
                defOptions[prop] = {
                    enumerable: true,
                    get: function() {
                        return _props[prop]
                    }
                }
            })
            Object.defineProperties(model, defOptions)
        }


        function _$computed (propname, deps, fn) {
            switch (false) {
                case (util.type(propname) == 'string'): 
                    info.warn('Computed property\'s name show be type of String')
                case (util.type(deps) == 'array'): 
                    info.warn('Computed property\'s "deps" show be type of Array')
                case (util.type(deps) == 'fn'):
                    info.warn('Computed property\'s "fn" show be type of Function')
            }

            ;(deps || []).forEach(function (dep) {
                util.patch(_computedDepsMapping, dep, [])
                if (~_computedDepsMapping[dep].indexOf(propname)) return
                _computedDepsMapping[dep].push(propname)
            })
            Object.defineProperty(model, propname, {
                enumerable: true,
                get: function () {
                    return (fn || NOOP).call(model)
                }
            })
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
                value: function(propame) {
                    if (util.type(propame) == 'string') {
                        _$add(propame)
                    } else if (util.type(propame) == 'array') {
                        _$addMulti(propame)
                    }
                }
            },
            "$computed":  {
                enumerable: false,
                value: function (propname, deps, fn) {
                    if (util.type(propname) == 'string') {
                        _$computed(propname, deps, fn)
                    }
                    else if (util.type(propname) == 'object') {
                        var propsObj = arguments[0]
                        for (propname in propsObj) {
                            var pobj = propsObj[propname]
                            _$computed(propname, pobj.deps, pobj.fn)
                        }
                    }
                    info.warn('$computed params show be "(String, Array, Function)" or "(Object)"')
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
