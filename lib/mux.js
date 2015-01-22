'use strict';

var Message = require('./message')
var expect = require('./expect')
var keypath = require('./keypath')
var arrayHook = require('./array-hook')
var info = require('./info')
var util = require('./util')


var _id = 0
function allotId() {
    return _id ++
}

/**
 *  Mux model constructor
 *  @public
 */
function Mux(options) {
    // static config checking
    options = options || {}
    staticOptionCheck(options)
    Ctor.call(this, options)
}

/**
 *  Mux model creator 
 *  @public
 */
Mux.extend = function(options) {
    return MuxFactory(options || {})
}

/**
 *  Mux global config
 *  @param conf <Object>
 */
Mux.config = function (conf) {
    if (conf.warn === false) info.disable()
    else info.enable()
}

/**
 *  Mux model factory
 *  @private
 */
function MuxFactory(options) {
    // static config checking
    staticOptionCheck(options)

    return function (receiveProps) {
        var proto = this.__proto__
        this.__proto__ = Mux.prototype
        this.__proto__.__proto__ = proto
        Ctor.call(this, options, receiveProps)
    }
}
/**
 *  Mux's model class, could instance with "new" operator or call it directly.
 *  @param receiveProps <Object> initial props set to model which will no trigger change event.
 */
function Ctor(options, receiveProps) {
    var model = this
    var emitter = options.emitter || new Message(model) // EventEmitter of this model, context bind to model
    var _isDeep = !!options.deep

    /**
     *  instance identifier
     */
    Object.defineProperty(model, '__muxid__', {
        enumerable: false,
        value: allotId()
    })
    /**
     *  return current keypath prefix of this model
     */
    function _rootPath () {
        return model.__kp__ || ''
    }
    /**
     *  local proxy for EventEmitter
     */
    function _emit(propname/*, arg1, ..., argX*/) {
        var prefix = _rootPath()
        var args = arguments
        prefix && (prefix += '.')
        args[0] = 'change:' + prefix + propname
        emitter.emit.apply(emitter, args)
    }
    function _emitAll() {
        var args = util.copyArray(arguments)
        var message = '*:' + _rootPath()
        args.unshift(message)
        emitter.emit.apply(emitter, args)
    }

    var getter = options.props
    var observedDefOptions = {}
    var computedDefOptions = {}

    /**
     *  Get initial props from options
     */
    var _initialProps
    if (util.type(getter) == 'function') {
        _initialProps = getter()
    } else if (util.type(getter) == 'object') {
        _initialProps = getter
    } else {
        _initialProps = {}
    }

    var _computedProps = options.computed || {}
    var _observableKeys = Object.keys(_initialProps)
    var _computedKeys = Object.keys(_computedProps)
    var _computedMetas = {}
    var _props = {} // all observable properties {propname: propvalue}
    var _computedDepsMapping = {} // mapping: deps --> props

    /**
     *  Observe each prop of props that return from props function
     */
    _observableKeys.forEach(function(prop) {
        _props[prop] = _valueHook(prop, _initialProps[prop])
        observedDefOptions[prop] = {
            enumerable: true,
            get: function() {
                return _props[prop]
            },
            set: function (value) {
                _$set(prop, value)
            }
        }
    })

    /**
     *  define enumerable properties
     */
    Object.defineProperties(model, observedDefOptions)
    observedDefOptions = null

    /**
     *  define initial computed properties
     */
    _computedKeys.forEach(function(ck) {
        var prop = _computedProps[ck]
        var deps = prop.deps
        var fn = prop.fn

        if (util.type(fn) != 'function') 
            info.warn('Computed property ' + ck + '\'s "fn" should be a function')
        
        if (!deps) return
        /**
         *  add dependence to computed props mapping
         */
        deps.forEach(function (dep) {
            _add2ComputedDepsMapping(ck, dep)
        })
        util.patch(_computedMetas, ck, {})
        _computedMetas[ck].current = (fn || NOOP).call(model, model)

        computedDefOptions[ck] = {
            enumerable: true,
            get: function() {
                return _computedMetas[ck].current
            },
            set: function () {
                info.warn('Can not set value to a computed property')
            }
        }
    })

    /**
     *  define enumerable properties
     */
    Object.defineProperties(model, computedDefOptions)
    computedDefOptions = null


    function _copyValue (v) {
        var t = util.type(v)
        switch(t) {
            case 'object': return util.copyObj(v)
            case 'array': return util.copyArray(v)
            default: return v
        }
    }

    /**
     *  add dependence to "_computedDepsMapping"
     */
    function _add2ComputedDepsMapping (propname, dep) {
        if (~_computedKeys.indexOf(dep)) 
           return info.warn('"' + prop + '" is a computed property, couldn\'t depend a computed property')

        util.patch(_computedDepsMapping, dep, [])
        if (~_computedDepsMapping[dep].indexOf(propname)) return
        _computedDepsMapping[dep].push(propname)
    }
    /**
     *  Instance (or reuse) and set/reset keyPath and set/reset emitter
     */
    function _instanceWithKeypath (target, props, kp) {
        var ins
        if (target instanceof Mux && target.__kp__ == kp) {
            ins = target
            ins.$emitter(emitter)
        } else {
            ins = new Mux({props: props, emitter: emitter, deep: true})
        }
        if (ins.__kp__ == undefined) {
            Object.defineProperty(ins, '__kp__', {
                enumerable: false,
                get: function () {
                    return kp
                },
                set: function (value) {
                    kp = value
                }
            })
        } else if (ins.__kp__ != kp) {
            ins.__kp__ = kp
        }
        return ins
    }

    /**
     *  A hook method for setting value to "_props"
     */
    function _valueHook (name, value, keyPathPrefix) {
        var valueType = util.type(value)
        // initial prefix is root path
        var kp = keyPathPrefix ? keyPathPrefix : _rootPath() + (_rootPath() ? '.':'') + name
        /**
         *  Array methods hook
         */
        if (valueType == 'array') {
            arrayHook(value, function (tar, methodName, nativeMethod, args) {
                var pv = util.copyArray(tar)
                var result = nativeMethod.apply(tar, args)
                _props[name] = _valueHook(name, tar, kp)
                _emit(name, tar, pv)
                _triggerPropertyComputedChange(name)
                return result
            })
        }

        if (!_isDeep) return value
        // deep observe into each prop
        switch(valueType) {

            case 'object': 
                var props = {}
                var obj = value
                if (value instanceof Mux) obj = value.$props()
                util.objEach(obj, function (k, v) {
                    props[k] = _valueHook(k, v, kp + '.' + k)
                })
                return _instanceWithKeypath(value, props, kp)

            case 'array':
                value.forEach(function (item, index) {
                    // depp into array items
                    item = _valueHook(index, item, kp + '[' + index + ']')

                    Object.defineProperty(value, index, {
                        enumerable: true,
                        get: function () {
                            return item
                        },
                        set: function (v) {
                            var pv = v
                            var _kp = name + '[' + index + ']'
                            item = _valueHook(index, v, _kp)
                            _emit(_kp, item, pv)
                        }
                    })
                })
                return value

            default: 
                return value

        }
    }

    /**
     *  Trigger computed change
     *  @param propname <String>
     */
    function _triggerPropertyComputedChange (propname) {
        ;(_computedDepsMapping[propname] || []).forEach(function (ck/*computed key*/) {
            // values cached in meta object
            util.patch(_computedMetas, ck, {})
            // value swap
            _computedMetas[ck].pre = _computedMetas[ck].current
            _computedMetas[ck].current = (_computedProps[ck].fn || NOOP).call(model, model)
            // emit and passing (next-value, previous-value) 
            _emit(ck, _computedMetas[ck].current, _computedMetas[ck].pre)
        })
    }

    /**
     *  set key-value pair to private model's props store
     *  @param kp <String> keyPath
     *  @return <Object>
     */
    function _$sync(kp, value) {
        var parts = keypath.normalize(kp).split('.')
        var prop = parts[0]

        if (~_computedKeys.indexOf(prop)) {
            info.warn('Can\'t set value to computed property "' + prop + '"')
            // return false means sync prop fail
            return false
        }
        if (!~_observableKeys.indexOf(prop)) {
            info.warn('Property "' + prop + '" has not been observed')
            // return false means sync prop fail
            return false
        }

        var preValue = _props[prop]
        keypath.set(_props, kp, value, function (tar, key, v) {
            v = _copyValue(value)
            if (tar instanceof Mux) {
                if (tar.hasOwnProperty(key)) {
                    tar.$set(key, v)
                } else {
                    tar.$add(key, v)
                }
            } else {
                tar[key] = _copyValue(v)
            }
        })
        var nextValue = _props[prop]
        /**
         *  return previous and next value for another compare logic
         */
        return {
            mounted: prop,
            next: nextValue,
            pre: preValue
        }
    }

    /**
     *  sync props value and trigger change event
     *  @param kp <String> keyPath
     */
    function _$set(kp, value) {
        var preProps = util.merge({}, model)
        var diff = _$sync(kp, value)
        if (!diff) return
        /**
         *  Base type change of object type will be trigger change event
         *  next and pre value are not keypath value but property value
         */
        if ( ((_isDeep && kp == diff.mounted) || !_isDeep) && util.diff(diff.next, diff.pre) ) {
            var propname = diff.mounted
            _triggerPropertyComputedChange(propname)
            _emit(propname, diff.next, diff.pre)
            
            // emit those wildcard callbacks
            // passing nextPropsObj and prePropsObj as arguments
            _emitAll(util.merge({}, model), preProps)
        }
    }

    /**
     *  sync props's value in batch and trigger change event
     *  @param keyMap <Object> properties object
     */
    function _$setMulti(keyMap) {
        if (!keyMap || util.type(keyMap) != 'object') {return}
        var willComputedProps = []
        var preProps = util.merge({}, model)
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
                if (((_isDeep && key == diff.mounted) || !_isDeep) && util.diff(diff.next, diff.pre)) {
                    var propname = diff.mounted
                    // emit change immediately
                    _emit(propname, diff.next, diff.pre)

                    // for batching emit, if deps has multiple change in once, only trigger one times 
                    ;(_computedDepsMapping[propname] || []).reduce(function (pv, cv) {
                        if (!~pv.indexOf(cv)) pv.push(cv)
                        return pv
                    }, willComputedProps)
                    hasDiff = true
                }
            }
        }
        /**
         *  Trigger computed property change event in batch
         */
        willComputedProps.forEach(function (ck) {
            util.patch(_computedMetas, ck, {})
            // next --> pre, last --> next swap
            var pre = _computedMetas[ck].pre = _computedMetas[ck].current
            var next = _computedMetas[ck].current = (_computedProps[ck].fn || NOOP).call(model, model)
            if (util.diff(next, pre)) _emit(ck, next, pre)
        })
        // emit those wildcard listener's callbacks
        hasDiff && _emitAll(util.merge({}, model), preProps)
    }

    /**
     *  create a prop observer
     *  @param prop <String> property name
     *  @param value property value
     */
    function _$add(prop, value) {
        var len = arguments.length
        expect(!prop.match(/[\.\[\]]/), 'Unexpect propname ' + +', it shoudn\'t has "." and "[" and "]"')

        if (~_observableKeys.indexOf(prop)) {
            // If value is specified, reset value
            if (len > 1) _$set(prop, value)
            return
        }
        _props[prop] = _valueHook(prop, _copyValue(value))
        _observableKeys.push(prop)
        Object.defineProperty(model, prop, {
            enumerable: true,
            get: function() {
                return _props[prop]
            },
            set: function (v) {
                _$set(prop, v)
            }
        })
        // add peroperty will trigger change event
        _emit(prop, value)
    }

    /**
     *  create observers for multiple props without set/reset value
     *  @param props <Array> properties name list
     */
    function _$addMulti(props) {
        var defOptions = {}
        props.forEach(function(prop) {
            expect(!prop.match(/[\.\[\]]/), 'Unexpect propname ' + +', it shoudn\'t has "." and "[" and "]"')
            // already exist in observers
            if (~_observableKeys.indexOf(prop)) return
            _observableKeys.push(prop)
            defOptions[prop] = {
                enumerable: true,
                get: function() {
                    return _props[prop]
                }
            }
        })
        // define properties in batch
        Object.defineProperties(model, defOptions)
    }
    /**
     *  create observers for multiple props and set/reset with specified value
     *  @param propsObj <Object> properties map
     */
    function _$addMultiObject(propsObj) {
        var defOptions = {}
        var resetProps

        util.objEach(propsObj, function (prop, pv) {
            pv = propsObj[prop]
            expect(!prop.match(/[\.\[\]]/), 'Unexpect propname ' + +', it shoudn\'t has "." and "[" and "]"')

            // already exist in observers
            if (~_observableKeys.indexOf(prop)) {
                // batch to reset property's value
                !resetProps && (resetProps = {})
                resetProps[prop] = pv
                return
            }
            
            _props[prop] = _valueHook(prop, pv)
            _observableKeys.push(prop)

            defOptions[prop] = {
                enumerable: true,
                get: function() {
                    return _props[prop]
                }
            }
        })
        // define properties in batch
        Object.defineProperties(model, defOptions)
        resetProps && _$setMulti(resetProps)
    }

    /**
     *  define computed prop/props of this model
     *  @param propname <String> property name
     *  @param deps <Array> computed property dependencies
     *  @param fn <Function> computed property getter
     */
    function _$computed (propname, deps, fn) {
        switch (false) {
            case (util.type(propname) == 'string'): 
                info.warn('Computed property\'s name should be type of String')
            case (util.type(deps) == 'array'): 
                info.warn('Computed property\'s "deps" should be type of Array')
            case (util.type(fn) == 'function'):
                info.warn('Computed property\'s "fn" should be type of Function')
        }
        /**
         *  property is exist
         */
        if (~_computedKeys.indexOf(propname)) return
        _computedKeys.push(propname)
        _computedProps[propname] = {
            'deps': deps, 
            'fn': fn
        }

        /**
         *  Add to dependence-property mapping
         */
        ;(deps || []).forEach(function (dep) {
            _add2ComputedDepsMapping(propname, dep)
        })
        /**
         *  define getter
         */
        util.patch(_computedMetas, propname, {})
        _computedMetas[propname].current = (fn || NOOP).call(model, model)

        Object.defineProperty(model, propname, {
            enumerable: true,
            get: function () {
                return _computedMetas[propname].current
            }
        })
    }

    /**
     *  define instantiation's methods
     */
    Object.defineProperties(model, {
        /**
         *  define observerable prop/props
         *  @param prop <String> | <Array>
         */
        "$add": {
            enumerable: false,
            value: function(/* [propname [, defaultValue]] | propnameArray | propsObj */) {
                var first = arguments[0]
                var firstType = util.type(first)

                if (firstType == 'string') {
                    // with specified value or not
                    arguments.length > 1 ? _$add(arguments[0], arguments[1]) : _$add(arguments[0])
                } else if (firstType == 'array') {
                    // observe properties without value
                    _$addMulti(first)
                } else if (firstType == 'object') {
                    // observe properties with value, if key already exist, reset value only
                    _$addMultiObject(first)
                }

                return this
            }
        },
        /**
         *  define computed prop/props
         *  @param propname <String> property name
         *  @param deps <Array> computed property dependencies
         *  @param fn <Function> computed property getter
         *  
         *  @param propsObj <Object> define multiple properties
         */
        "$computed":  {
            enumerable: false,
            value: function (propname, deps, fn/* | [propsObj]*/) {
                if (util.type(propname) == 'string') {
                    _$computed(propname, deps, fn)
                } else if (util.type(propname) == 'object') {
                    var propsObj = arguments[0]
                    for (propname in propsObj) {
                        var pobj = propsObj[propname]
                        _$computed(propname, pobj.deps, pobj.fn)
                    }
                } else {
                    info.warn('$computed params show be "(String, Array, Function)" or "(Object)"')
                }

                return this
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
                if (len >= 2 || (len == 1 && util.type(arguments[0]) == 'string')) {
                    _$set(arguments[0], arguments[1])
                } else if (len == 1 && util.type(arguments[0]) == 'object') {
                    _$setMulti(arguments[0])
                } else {
                    info.warn('Unexpect $set params')
                }

                return this
            }
        },

        /**
         *  Get property value by name, using for get value of computed property without cached
         *  change prop/props value, it will be trigger change event
         *  @param kp <String>
         *  @param kpMap <Object>
         */
        "$get": {
            enumerable: false,
            value: function(propname) {
                if (~_observableKeys.indexOf(propname)) 
                    return _props[propname]
                else if (~_computedKeys.indexOf(propname)) {
                    return (_computedProps[propname].fn || NOOP).call(model, model)
                }
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
                    var prefix = _rootPath()
                    prefix && (prefix += '.')
                    key = 'change:' + arguments[0]
                    callback = arguments[1]
                } else if (len == 1 && util.type(arguments[0]) == 'function') {
                    key = '*:' + _rootPath()
                    callback = arguments[0]
                } else {
                    info.warn('Unexpect $watch params')
                    return NOOP
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
                var key
                var prefix = _rootPath()
                if (len >= 2) {
                    // key + callback
                    prefix && (prefix += '.')
                    key = 'change:' + prefix + arguments[0]
                    emitter.off(key, arguments[1])
                } else if (len == 1 && util.type(arguments[0]) == 'string') {
                    // key
                    prefix && (prefix += '.')
                    emitter.off('change:' + prefix + arguments[0])
                } else if (len == 1 && util.type(arguments[0]) == 'function') {
                    // callback
                    emitter.off('*:' + prefix, arguments[0])
                } else if (len == 0) {
                    // all
                    emitter.off()
                } else {
                    info.warn('Unexpect param type of ' + arguments[0])
                }

                return this
            }
        },
        /**
         *  return all properties without computed properties
         */
        "$props": {
            enumerable: false,
            value: function() {
                return util.copyObject(_props)
            }
        },
        /**
         *  instance identifier
         */
        "$emitter": {
            enumerable: false,
            value: function (em) {
                emitter = em
            }
        }
    })
    /**
     *  A shortcut of $set(props) while instancing
     */
    _$setMulti(receiveProps)

}
function NOOP() {}
/**
 *  Check option's keys type when Mux class instance
 *  if type is unvalid throw an error
 */
function staticOptionCheck(options) {
    if (!options) return
    var getter = options.props
    var computed = options.computed
    getter && expect.type(getter, ['function', 'object'])
    computed && expect.type(computed, ['object'])
}

module.exports = Mux
