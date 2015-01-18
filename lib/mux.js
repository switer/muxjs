'use strict';

var Message = require('./message')
var expect = require('./expect')
var keypath = require('./keypath')
var arrayHook = require('./array-hook')
var info = require('./info')
var util = require('./util')


/**
 *  Mux model constructor
 *  @public
 */
function Mux(options) {
    Ctor.call(this, options)
}

/**
 *  Mux model creator 
 *  @public
 */
Mux.extend = function(options) {
    return MuxFactory(options)
}

/**
 *  Mux global config
 *  @param conf <Object>
 */
Mux.config = function (conf) {
    if (conf.warn == false) info.disable()
    if (conf.warn == true) info.enable()
}

/**
 *  Mux model factory
 *  @private
 */
function MuxFactory(options) {

    // static config checking
    var getter = options.props
    getter && expect.type(getter, 'function')
    return function (receiveProps) {
        Ctor.call(this, options, receiveProps)
    }
}
/**
 *  Mux's model class, could instance with "new" operator or call it directly.
 *  @param receiveProps <Object> initial props set to model which will no trigger change event.
 */
function Ctor (options, receiveProps) {
    // if (!(this instanceof Ctor) && !(this instanceof Mux)) return new Ctor(receiveProps)
    var model = this
    var emitter = new Message(model) // EventEmitter of this model, context bind to model
    var getter = options.props
    var observedDefOptions = {}
    var computedDefOptions = {}
    var defOptions = {}

    var _initialProps = getter ? getter.call(this) : {}
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
        _props[prop] = _initialProps[prop]
        var propvalue = _props[prop]
        // initial properties object method's hook
        _objectMethodsHook(prop, propvalue)
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
        _computedMetas[ck].current = (fn || NOOP).call(model)

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

    function _objectMethodsHook (propname, propvalue) {
        if (util.type(propvalue) == 'array') {
            /**
             *  Hook will be call when those hook methods calling
             */
            arrayHook(propvalue, function (methodName, nativeMethod, args) {
                var preValue = propvalue.slice(0)
                var result = nativeMethod.apply(propvalue, args)

                _props[propname] = propvalue

                emitter.emit('change:' + propname, propvalue, preValue)
                _triggerPropertyComputedChange(propname)
                return result
            })
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
            _computedMetas[ck].current = (_computedProps[ck].fn || NOOP).call(model)
            // emit and passing (next-value, previous-value) 
            emitter.emit('change:'+ ck, _computedMetas[ck].current, _computedMetas[ck].pre)
        })
    }

    /**
     *  set key-value pair to private model's props store
     *  @param kp <String> keyPath
     *  @return <Object>
     */
    function _$sync(kp, value, syncHook) {
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
        // here for geting computed value before change
        syncHook && syncHook()
        keypath.set(_props, kp, value)
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
        
        if (~_computedKeys.indexOf(kp))
            return info.warn('Could not set value to computed property ' + kp)

        var diff = _$sync(kp, value)
        if (!diff) return

        /**
         *  Base type change of object type will be trigger change event
         */
        if (diff.next !== diff.pre || diff.next instanceof Object) {
            var propname = diff.mounted
            // Here to set Array method hooks
            _objectMethodsHook(propname, _props[propname])
            _triggerPropertyComputedChange(propname)
            emitter.emit('change:' + propname, diff.next, diff.pre)
            
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

        for (var key in keyMap) {
            if (keyMap.hasOwnProperty(key)) {
                diff = _$sync(key, keyMap[key])
                if (!diff) continue
                /**
                 *  if props is not congruent or diff is an object reference value
                 *  then emit change event
                 */
                if (diff.next !== diff.pre || diff.next instanceof Object) {
                    var propname = diff.mounted
                    // Here to set Array method hooks
                    _objectMethodsHook(propname, _props[propname])

                    // emit change immediately
                    emitter.emit('change:' + propname, diff.next, diff.pre)

                    // for batching emit, if deps has multiple change in once, only trigger one times 
                    ;(_computedDepsMapping[propname] || []).reduce(function (pv, cv, index) {
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
            _computedMetas[ck].pre = _computedMetas[ck].current
            _computedMetas[ck].current = (_computedProps[ck].fn || NOOP).call(model)
            emitter.emit('change:' + ck)
        })
        // emit those wildcard listener's callbacks
        hasDiff && emitter.emit('*')
    }

    /**
     *  create a prop observer
     *  @param prop <String> property name
     */
    function _$add(prop) {
        expect(!prop.match(/[\.\[\]]/), 'Unexpect propname ' + +', it shoudn\'t has "." and "[" and "]"')
        if (~_observableKeys.indexOf(prop)) return
        _observableKeys.push(prop)
        Object.defineProperty(model, prop, {
            enumerable: true,
            get: function() {
                return _props[prop]
            },
            set: function (value) {
                _$set(prop, value)
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
        _computedMetas[propname].current = (fn || NOOP).call(model)

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
            value: function(/* propname1 [, propname2, ..., propname3 ] */) {
                var len = arguments.length
                if (len > 1) {
                    var args = new Array(len)
                    while(len) {
                        args[len] = arguments[--len]
                    }
                    _$addMulti(args)
                } else if (len == 1) {
                    _$add(arguments[0])
                }
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
                else if (~_computedKeys.indexOf(propname)) 
                    return (_computedProps[propname].fn || NOOP).call(model)
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
                } else if (len == 1 && util.type(arguments[0]) == 'function') {
                    key = '*'
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
                var key, callback

                if (len >= 2) {
                    key = 'change:' + arguments[0]
                    emitter.off(key, arguments[1])
                } else if (len == 1 && util.type(arguments[0]) == 'string') {
                    emitter.off('change:' + arguments[0])
                } else if (len == 1 && util.type(arguments[0]) == 'function') {
                    emitter.off('*', arguments[0])
                } else if (len == 0) {
                    emitter.off()
                } else {
                    info.warn('Unexpect param type of ' + arguments[0])
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

function NOOP() {}

module.exports = Mux
