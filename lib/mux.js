'use strict';

/**
 *  External module's name startof "$"
 */
var $Message = require('./message')
var $expect = require('./expect')
var $keypath = require('./keypath')
var $arrayHook = require('./array-hook')
var $info = require('./info')
var $util = require('./util')

/**
 *  CONTS
 */
var STRING = 'string'
var ARRAY = 'array'
var OBJECT = 'object'
var FUNCTION = 'function'
var CHANGE_EVENT = 'change'

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
    if (conf.warn === false) $info.disable()
    else $info.enable()
}

/**
 *  Create a emitter instance
 *  @param `Optional` context use for binding "this"
 */
Mux.emitter = function (context) {
    return new $Message(context)
}

/**
 *  Expose Keypath API
 */
Mux.keyPath = $keypath

/**
 *  Mux model factory
 *  @private
 */
function MuxFactory(options) {

    return function (receiveProps) {
        if (!(this instanceof Mux)) $util.insertProto(this, Mux.prototype)
        Ctor.call(this, options, receiveProps)
    }
}
/**
 *  Mux's model class, could instance with "new" operator or call it directly.
 *  @param receiveProps <Object> initial props set to model which will no trigger change event.
 */
function Ctor(options, receiveProps) {
    var model = this
    var emitter = options.emitter || new $Message(model) // EventEmitter of this model, context bind to model
    var _emitter = options._emitter || new $Message(model)
    var _isDeep = options.deep || !options.hasOwnProperty('deep') // default to true
    var __kp__ = options.__kp__
    var __muxid__ = allotId()
    var _isExternalEmitter =  !!options.emitter
    var _isExternalPrivateEmitter =  !!options._emitter
    var _destroy = false // destroy flag
    var proto = {
        '__muxid__': __muxid__
    }


    $util.insertProto(model, proto)

    /**
     *  return current keypath prefix of this model
     */
    function _rootPath () {
        return __kp__ || ''
    }

    var getter = options.props

    /**
     *  Get initial props from options
     */
    var _initialProps = {}
    var _t = $util.type(getter)
    if (_t == FUNCTION) {
        _initialProps = getter()
    } else if (_t == OBJECT) {
        _initialProps = getter
    }
    // free
    getter = null

    var _initialComputedProps = options.computed
    var _computedProps = {}
    var _computedKeys = []
    var _cptDepsMapping = {} // mapping: deps --> props
    var _cptCaches = {} // computed properties caches
    var _observableKeys = []
    var _props = {} // all observable properties {propname: propvalue}

    /**
     *  Observe initial properties
     */
    $util.objEach(_initialProps, function (pn, pv) {
        _$add(pn, pv)
    })
    _initialProps = null

    /**
     *  Define initial computed properties
     */
    $util.objEach(_initialComputedProps, function (pn, def) {
        _$computed(pn, def.deps, def.fn, def.enum)
    })
    _initialComputedProps = null

    /**
     *  batch emit computed property change
     */
    _emitter.on(CHANGE_EVENT, function (kp) {
        var willComputedProps = []
        /**
         *  get all computed props that depend on kp
         */
        ;(_cptDepsMapping[kp] || []).reduce(function (pv, cv) {
            if (!~pv.indexOf(cv)) pv.push(cv)
            return pv
        }, willComputedProps)

        willComputedProps.forEach(function (ck) {
            $util.patch(_cptCaches, ck, {})
            var cache = _cptCaches[ck]
            var pre = cache.pre = cache.current
            var next = cache.current = (_computedProps[ck].fn || NOOP).call(model, model)

            if ($util.diff(next, pre)) _emitChange(ck, next, pre)
        })
    }, __muxid__/*scope*/)


    /**
     *  private methods
     */
    function _checkDestroy () {
        if (_destroy) {
            $info.warn('Instance already has bean destroyed')
            return true
        }
    }
    //  local proxy for EventEmitter
    function _emitChange(propname/*, arg1, ..., argX*/) {
        var args = arguments
        var evtArgs = $util.copyArray(args)
        var kp = $keypath.normalize($keypath.join(_rootPath(), propname))

        args[0] = CHANGE_EVENT + ':' + kp
        _emitter.emit(CHANGE_EVENT, kp)
        emitter.emit.apply(emitter, args)

        evtArgs[0] = kp
        evtArgs.unshift('*')
        emitter.emit.apply(emitter, evtArgs)
    }
    /**
     *  Add dependence to "_cptDepsMapping"
     *  @param propname <String> property name
     *  @param dep <String> dependency name
     */
    function _prop2CptDepsMapping (propname, dep) {
        if (~_computedKeys.indexOf(dep)) 
           return $info.warn('Dependency should not computed property')

        $util.patch(_cptDepsMapping, dep, [])
        var dest = _cptDepsMapping[dep]
        if (~dest.indexOf(propname)) return
        dest.push(propname)
    }
    /**
     *  Instance or reuse a sub-mux-instance with specified keyPath and emitter
     *  @param target <Object> instance target, it could be a Mux instance
     *  @param props <Object> property value that has been walked
     *  @param kp <String> keyPath of target, use to diff instance keyPath changes or instance with the keyPath
     */
    function _subInstance (target, props, kp) {

        var ins
        if (target instanceof Mux && target.__kp__ === kp && target.__root__ == __muxid__) {
            // reuse
            ins = target
            // emitter proxy
            ins._$emitter(emitter)
            // a private emitter for communication between instances
            ins._$_emitter(_emitter)
        } else {
            ins = new Mux({
                props: props,
                emitter: emitter, 
                deep: true,
                _emitter: _emitter,
                __kp__: kp
            })
        }
        if (ins.__root__ == undefined) {
            $util.def(ins, '__root__', {
                enumerable: false,
                value: __muxid__
            })
        }
        return ins
    }

    /**
     *  A hook method for setting value to "_props"
     *  @param name <String> property name
     *  @param value
     *  @param basePath <String> property's value mouted path
     */
    function _walk (name, value, basePath) {
        var tov = $util.type(value) // type of value
        // initial path prefix is root path
        var kp = basePath ? basePath : $keypath.join(_rootPath(), name)
        /**
         *  Array methods hook
         */
        if (tov == ARRAY) {
            $arrayHook(value, function (self, methodName, nativeMethod, args) {
                var pv = $util.copyArray(self)
                var result = nativeMethod.apply(self, args)
                // set value directly after walk
                _props[name] = _walk(name, self, kp)

                _emitChange(name, self, pv)
                return result
            })
        }

        if (!_isDeep) return value
        // deep observe into each property value
        switch(tov) {
            case OBJECT: 
                // walk deep into object items
                var props = {}
                var obj = value
                if (value instanceof Mux) obj = value.$props()
                $util.objEach(obj, function (k, v) {
                    props[k] = _walk(k, v, $keypath.join(kp, k))
                })
                return _subInstance(value, props, kp)
            case ARRAY:
                // walk deep into array items
                value.forEach(function (item, index) {
                    value[index] = _walk(index, item, $keypath.join(kp, index))
                    /**
                     *  "defineProperty" to array indexcies will cause performance problem
                     *  remove it
                     */
                    // $util.def(value, index, {
                    //     enumerable: true,
                    //     get: function () {
                    //         return item
                    //     },
                    //     set: function (v) {
                    //         var pv = item
                    //         var mn = $keypath.join(name, index) // mounted property name
                    //         item = _walk(index, v, $keypath.join(kp, index))
                    //         _emitChange(mn, item, pv)
                    //     }
                    // })
                })
                return value
            default: 
                return value
        }
    }

    /*************************************************************
            Function name start of "_$" are expose methods
    *************************************************************/
    /**
     *  Set key-value pair to private model's property-object
     *  @param kp <String> keyPath
     *  @return <Object> diff object
     */
    function _$sync(kp, value) {
        var parts = $keypath.normalize(kp).split('.')
        var prop = parts[0]

        if (~_computedKeys.indexOf(prop)) {
            $info.warn('Can\'t set value to computed property "' + prop + '"')
            // return false means sync prop fail
            return false
        }
        if (!~_observableKeys.indexOf(prop)) {
            $info.warn('Property "' + prop + '" has not been observed')
            // return false means sync prop fail
            return false
        }

        var pv = _props[prop] // old value
        var isArrayChange
        var piv
        $keypath.set(_props, kp, value, function (tar, key, v) {
            v = $util.copyValue(value)
            if (tar instanceof Mux) {
                if (tar.hasOwnProperty(key)) {
                    tar.$set(key, v)
                } else {
                    tar.$add(key, v)
                }
            } else {
                if ( _isDeep && $util.type(tar) == ARRAY && key.match(/^\d+$/) )  {
                    isArrayChange = true
                    piv = tar[key]
                }
                tar[key] = v
            }
        })
        if (isArrayChange) {
            _emitChange(kp, value, piv)
        }
        /**
         *  return previous and next value for another compare logic
         */
        return {
            mounted: prop,
            next: _props[prop],
            pre: pv
        }
    }

    /**
     *  sync props value and trigger change event
     *  @param kp <String> keyPath
     */
    function _$set(kp, value) {
        if(_checkDestroy()) return

        var diff = _$sync(kp, value)
        if (!diff) return
        /**
         *  Base type change of object type will be trigger change event
         *  next and pre value are not keypath value but property value
         */
        if ( ((_isDeep && kp == diff.mounted) || !_isDeep) && $util.diff(diff.next, diff.pre) ) {
            var propname = diff.mounted
            // emit change immediately
            _emitChange(propname, diff.next, diff.pre)
        }
    }

    /**
     *  sync props's value in batch and trigger change event
     *  @param keyMap <Object> properties object
     */
    function _$setMulti(keyMap) {

        if (!keyMap || $util.type(keyMap) != OBJECT) return
        $util.objEach(keyMap, function (key, item) {
            _$set(key, item)
        })
    }

    /**
     *  create a prop observer
     *  @param prop <String> property name
     *  @param value property value
     */
    function _$add(prop, value) {
        var len = arguments.length
        $expect(!prop.match(/[\.\[\]]/), 'Propname shoudn\'t contains "." or "[" or "]"')

        if (~_observableKeys.indexOf(prop)) {
            // If value is specified, reset value
            if (len > 1) return true
            return
        }
        _props[prop] = _walk(prop, $util.copyValue(value))
        _observableKeys.push(prop)
        $util.def(model, prop, {
            enumerable: true,
            get: function() {
                return _props[prop]
            },
            set: function (v) {
                _$set(prop, v)
            }
        })
        // add peroperty will trigger change event
        _emitChange(prop, value)
    }

    /**
     *  define computed prop/props of this model
     *  @param propname <String> property name
     *  @param deps <Array> computed property dependencies
     *  @param fn <Function> computed property getter
     *  @param enumerable <Boolean> whether property enumerable or not
     */
    function _$computed (propname, deps, fn, enumerable) {
        switch (false) {
            case ($util.type(propname) == STRING): 
                $info.warn('Propname\'s should be "String"')
            case ($util.type(deps) == ARRAY): 
                $info.warn('"deps" should be "Array"')
            case ($util.type(fn) == FUNCTION):
                $info.warn('"fn" should be "Function"')
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
            while(dep) {
                _prop2CptDepsMapping(propname, dep)
                dep = $keypath.digest(dep)
            }
        })
        /**
         *  define getter
         */
        $util.patch(_cptCaches, propname, {})
        _cptCaches[propname].current = fn ? fn.call(model, model):undefined

        $util.def(model, propname, {
            enumerable: enumerable === undefined ? true : !!enumerable,
            get: function () {
                return _cptCaches[propname].current
            },
            set: function () {
                $info.warn('Can\'t set value to computed property')
            }
        })
        // emit change event when define
        _emitChange(propname, _cptCaches[propname].current)
    }

     /*******************************
               define instantiation's methods
     *******************************/
    /**
     *  define observerable prop/props
     *  @param propname <String> | <Array>
     *  @param defaultValue Optional
     *  ----------------------------
     *  @param propnameArray <Array>
     *  ------------------------
     *  @param propsObj <Object>
     */
    proto.$add = function(/* [propname [, defaultValue]] | propnameArray | propsObj */) {
        if(_checkDestroy()) return
        var args = arguments
        var first = args[0]
        var pn, pv

        switch($util.type(first)) {
            case STRING:
                // with specified value or not
                pn = first
                if (args.length > 1) {
                    pv = args[1]
                    if (_$add(pn, pv)) {
                        _$set(pn, pv)
                    }
                } else {
                    _$add(pn)
                }
                break
            case ARRAY:
                // observe properties without value
                first.forEach(function (item) {
                    _$add(item)
                })
                break
            case OBJECT:
                // observe properties with value, if key already exist, reset value only
                var resetProps
                $util.objEach(first, function (ipn, ipv) {
                    if (_$add(ipn, ipv)) {
                        !resetProps && (resetProps = {})
                        resetProps[ipn] = ipv
                    }
                })
                if (resetProps) _$setMulti(resetProps)
                break
            default:
                $info.warn('Unexpect params')
        }
        return this
    }
        /**
         *  define computed prop/props
         *  @param propname <String> property name
         *  @param deps <Array> computed property dependencies
         *  @param fn <Function> computed property getter
         *  @param enumerable <Boolean> Optional, whether property enumerable or not
         *  --------------------------------------------------
         *  @param propsObj <Object> define multiple properties
         */
    proto.$computed = function (propname, deps, fn, enumerable/* | [propsObj]*/) {
        if(_checkDestroy()) return
        if ($util.type(propname) == STRING) {
            _$computed.apply(null, arguments)
        } else if ($util.type(propname) == OBJECT) {
            $util.objEach(arguments[0], function (pn, pv/*propname, propnamevalue*/) {
                _$computed(pn, pv.deps, pv.fn, pv.enum)
            })
        } else {
            $info.warn('$computed params show be "(String, Array, Function)" or "(Object)"')
        }
        return this
    }
    /**
     *  subscribe prop change
     *  change prop/props value, it will be trigger change event
     *  @param kp <String>
     *  ---------------------
     *  @param kpMap <Object>
     */
    proto.$set = function( /*[kp, value] | [kpMap]*/ ) {
        if(_checkDestroy()) return

        var args = arguments
        var len = args.length
        if (len >= 2 || (len == 1 && $util.type(args[0]) == STRING)) {
            _$set(args[0], args[1])
        } else if (len == 1 && $util.type(args[0]) == OBJECT) {
            _$setMulti(args[0])
        } else {
            $info.warn('Unexpect $set params')
        }

        return this
    }

    /**
     *  Get property value by name, using for get value of computed property without cached
     *  change prop/props value, it will be trigger change event
     *  @param kp <String> keyPath
     */
    proto.$get = function(kp) {
        if(_checkDestroy()) return
        if (~_observableKeys.indexOf(kp)) 
            return _props[kp]
        else if (~_computedKeys.indexOf(kp)) {
            return (_computedProps[kp].fn || NOOP).call(model, model)
        } else {
            // keyPath
            var normalKP = $keypath.normalize(kp)
            var parts = normalKP.split('.')
            if (!~_observableKeys.indexOf(parts[0])) {
                return
            } else {
                return $keypath.get(_props, normalKP)
            }
        }
    }
    /**
     *  if params is (key, callback), add callback to key's subscription
     *  if params is (callback), subscribe any prop change events of this model
     *  @param key <String> optional
     *  @param callback <Function>
     */
    proto.$watch =  function( /*[key, ]callback*/ ) {
        if(_checkDestroy()) return
        var args = arguments
        var len = args.length
        var first = args[0]
        var key, callback
        if (len >= 2) {
            key = 'change:' + $keypath.normalize($keypath.join(_rootPath(), first))
            callback = args[1]
        } else if (len == 1 && $util.type(first) == FUNCTION) {
            key = '*'
            callback = first
        } else {
            $info.warn('Unexpect $watch params')
            return NOOP
        }
        emitter.on(key, callback, __muxid__/*scopre*/)
        var that = this
        // return a unsubscribe method
        return function() {
            that.$unwatch.apply(that, args)
        }
    }
    /**
     *  unsubscribe prop change
     *  if params is (key, callback), remove callback from key's subscription
     *  if params is (callback), remove all callbacks from key' ubscription
     *  if params is empty, remove all callbacks of current model
     *  @param key <String>
     *  @param callback <Function>
     */
    proto.$unwatch = function( /*[key, ] [callback] */ ) {
        if(_checkDestroy()) return
        var args = arguments
        var len = args.length
        var first = args[0]
        var params
        var prefix
        switch (true) {
            case (len >= 2):
                params = [args[1]]
            case (len == 1 && $util.type(first) == STRING):
                !params && (params = [])
                prefix = CHANGE_EVENT + ':' + $keypath.normalize($keypath.join(_rootPath(), first))
                params.unshift(prefix)
                break
            case (len == 1 && $util.type(first) == FUNCTION):
                params = ['*', first]
                break
            case (len == 0):
                params = []
                break
            default:
                $info.warn('Unexpect param type of ' + first)
        }
        if (params) {
            params.push(__muxid__)
            emitter.off.apply(emitter, params)
        }
        return this
    }
    /**
     *  Return all properties without computed properties
     *  @return <Object>
     */
    proto.$props = function() {
        if(_checkDestroy()) return
        return $util.copyObject(_props)
    }
    /**
     *  Reset event emitter
     *  @param em <Object> emitter
     */
    proto.$emitter = function (em, _pem) {
        if(_checkDestroy()) return
        emitter = em
        _isDeep && _walkResetEmiter(this.$props(), em, _pem)
        return this
    }
    /**
     *  set emitter directly
     */
    proto._$emitter = function (em) {
        if(_checkDestroy()) return
        emitter = em
    }
    /**
     *  set private emitter directly
     */
    proto._$_emitter = function (em) {
        if(_checkDestroy()) return
        em instanceof $Message && (_emitter = em)
    }
    proto.$destroy = function () {
        if (_destroy) return

        if (!_isExternalEmitter) emitter.off()
        else emitter.off(__muxid__)

        if (!_isExternalEmitter) _emitter.off()
        else _emitter.off(__muxid__)

        emitter = null
        _emitter = null
        _computedProps = null
        _computedKeys = null
        _cptDepsMapping = null
        _cptCaches = null
        _observableKeys = null
        _props = null

        _destroy = true
    }
    /**
     *  A shortcut of $set(props) while instancing
     */
    _$setMulti(receiveProps)

}
/**
 *  Reset emitter of the instance recursively
 *  @param ins <Mux>
 */
function _walkResetEmiter (ins, em, _pem) {
    if ($util.type(ins) == OBJECT) {
        var items = ins
        if (ins instanceof Mux) {
            ins._$emitter(em, _pem)
            items = ins.$props()
        }
        $util.objEach(items, function (k, v) {
            _walkResetEmiter(v, em, _pem)
        })
    } else if ($util.type(ins) == ARRAY) {
        ins.forEach(function (v) {
            _walkResetEmiter(v, em, _pem)
        })
    }
}

function NOOP() {}

module.exports = Mux
