'use strict';

/**
 *  External module's name startof "$"
 */
var $Message = require('./message')
var $keypath = require('./keypath')
var $arrayHook = require('./array-hook')
var $info = require('./info')
var $util = require('./util')
var $normalize = $keypath.normalize
var $join = $keypath.join
var $type = $util.type
var $indexOf = $util.indexOf
var $hasOwn = $util.hasOwn
var $warn = $info.warn

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
Mux.utils = $util

/**
 *  Mux model factory
 *  @private
 */
function MuxFactory(options) {

    function Class (receiveProps) {
        Ctor.call(this, options, receiveProps)
    }
    Class.prototype = Object.create(Mux.prototype)
    return Class
}
/**
 *  Mux's model class, could instance with "new" operator or call it directly.
 *  @param receiveProps <Object> initial props set to model which will no trigger change event.
 */
function Ctor(options, receiveProps) {
    var model = this
    var emitter = options.emitter || new $Message(model) // EventEmitter of this model, context bind to model
    var _emitter = options._emitter || new $Message(model)
    var _computedCtx = $hasOwn(options, 'computedContext') ? options.computedContext : model
    var __kp__ = $keypath.normalize(options.__kp__ || '')
    var __muxid__ = allotId()
    var _isExternalEmitter =  !!options.emitter
    var _isExternalPrivateEmitter =  !!options._emitter
    var _destroy // interanl destroyed flag
    var _privateProperties = {}

    _defPrivateProperty('__muxid__', __muxid__)
    _defPrivateProperty('__kp__', __kp__)
    /**
     *  return current keypath prefix of this model
     */
    function _rootPath () {
        return __kp__ || ''
    }

    /**
     *  define priavate property of the instance object
     */
    function _defPrivateProperty(name, value) {
        if (instanceOf(value, Function)) value = value.bind(model)
        _privateProperties[name] = value
        $util.def(model, name, {
            enumerable: false,
            value: value
        })
    }

    var getter = options.props

    /**
     *  Get initial props from options
     */
    var _initialProps = {}
    var _t = $type(getter)
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
        _$add(pn, pv, true)
    })
    _initialProps = null

    /**
     *  Define initial computed properties
     */
    $util.objEach(_initialComputedProps, function (pn, def) {
        _$computed(pn, def.deps, def.get, def.set, def.enum)
    })
    _initialComputedProps = null


    /**
     *  batch emit computed property change
     */
    _emitter.on(CHANGE_EVENT, function (kp) {
        var willComputedProps = []
        var mappings = []

        if (!Object.keys(_cptDepsMapping).length) return

        while(kp) {
            _cptDepsMapping[kp] && (mappings = mappings.concat(_cptDepsMapping[kp]))
            kp = $keypath.digest(kp)
        }

        if (!mappings.length) return
        /**
         *  get all computed props that depend on kp
         */
        mappings.reduce(function (pv, cv) {
            if (!$indexOf(pv, cv)) pv.push(cv)
            return pv
        }, willComputedProps)

        willComputedProps.forEach(function (ck) {
            $util.patch(_cptCaches, ck, {})

            var cache = _cptCaches[ck]
            var pre = cache.pre = cache.cur
            var next = cache.cur = (_computedProps[ck].get || NOOP).call(_computedCtx, model)
            if ($util.diff(next, pre)) _emitChange(ck, next, pre)
        })
    }, __muxid__/*scope*/)


    /**
     *  private methods
     */
    function _destroyNotice () {
        $warn('Instance already has bean destroyed')
        return _destroy
    }
    //  local proxy for EventEmitter
    function _emitChange(propname/*, arg1, ..., argX*/) {
        var args = arguments
        var kp = $normalize($join(_rootPath(), propname))
        args[0] = CHANGE_EVENT + ':' + kp
        _emitter.emit(CHANGE_EVENT, kp)
        emitter.emit.apply(emitter, args)

        args = $util.copyArray(args)
        args[0] = kp
        args.unshift('*')
        emitter.emit.apply(emitter, args)
    }
    /**
     *  Add dependence to "_cptDepsMapping"
     *  @param propname <String> property name
     *  @param dep <String> dependency name
     */
    function _prop2CptDepsMapping (propname, dep) {
        // if ($indexOf(_computedKeys, dep))
        //    return $warn('Dependency should not computed property')
        $util.patch(_cptDepsMapping, dep, [])

        var dest = _cptDepsMapping[dep]
        if ($indexOf(dest, propname)) return
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
        var _mux = target.__mux__
        if (_mux && _mux.__kp__ === kp && _mux.__root__ === __muxid__) {
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
                _emitter: _emitter,
                __kp__: kp
            })
        }
        if (!ins.__root__) {
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
     *  @param mountedPath <String> property's value mouted path
     */
    function _walk (name, value, mountedPath) {
        var tov = $type(value) // type of value
        // initial path prefix is root path
        var kp = mountedPath ? mountedPath : $join(_rootPath(), name)
        /**
         *  Array methods hook
         */
        if (tov == ARRAY) {
            $arrayHook(value, function (self, methodName, nativeMethod, args) {
                var pv = $util.copyArray(self)
                var result = nativeMethod.apply(self, args)
                // set value directly after walk
                _props[name] = _walk(name, self, kp)
                if (methodName == 'splice') {
                    _emitChange(kp, self, pv, methodName, args)
                } else {
                    _emitChange(kp, self, pv, methodName)
                }
                return result
            })
        }

        // deep observe into each property value
        switch(tov) {
            case OBJECT: 
                // walk deep into object items
                var props = {}
                var obj = value
                if (instanceOf(value, Mux)) obj = value.$props()
                $util.objEach(obj, function (k, v) {
                    props[k] = _walk(k, v, $join(kp, k))
                })
                return _subInstance(value, props, kp)
            case ARRAY:
                // walk deep into array items
                value.forEach(function (item, index) {
                    value[index] = _walk(index, item, $join(kp, index))
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
    function _$sync(kp, value, lazyEmit) {
        var parts = $normalize(kp).split('.')
        var prop = parts[0]

        if ($indexOf(_computedKeys, prop)) {
            // since Mux@2.4.0 computed property support setter
            model[prop] = value
            return
        }
        if (!$indexOf(_observableKeys, prop)) {
            $warn('Property "' + prop + '" has not been observed')
            // return false means sync prop fail
            return
        }
        var pv = $keypath.get(_props, kp)
        var isObj = instanceOf(value, Object)
        var nKeypath = parts.join('.')
        var name = parts.pop()
        var parentPath = parts.join('.')
        var parent = $keypath.get(_props, parentPath)
        var isParentObserved = instanceOf(parent, Mux)
        var changed
        if (isParentObserved) {
            if ($hasOwn(parent, name)) {
                changed = parent._$set(name, value, lazyEmit)
            } else {
                parent._$add(name, value)
                changed = [$keypath.join(__kp__, kp), value]
            }
        } else {
            $keypath.set(
                _props, 
                kp, 
                isObj
                    ? _walk(name, value, $join(_rootPath(), nKeypath))
                    : value
            )
            if ($util.diff(value, pv)) {
                if (!lazyEmit) {
                    _emitChange(kp, value, pv)
                } else {
                    changed = [$keypath.join(__kp__, kp), value, pv]
                }
            }
        }
        return changed
    }

    /**
     *  sync props value and trigger change event
     *  @param kp <String> keyPath
     */
    function _$set(kp, value, lazyEmit) {
        if (_destroy) return _destroyNotice()

        return _$sync(kp, value, lazyEmit)
        // if (!diff) return
        /**
         *  Base type change of object type will be trigger change event
         *  next and pre value are not keypath value but property value
         */
        // if ( kp == diff.mounted && $util.diff(diff.next, diff.pre) ) {
        //     var propname = diff.mounted
        //     // emit change immediately
        //     _emitChange(propname, diff.next, diff.pre)
        // }
    }

    /**
     *  sync props's value in batch and trigger change event
     *  @param keyMap <Object> properties object
     */
    function _$setMulti(keyMap) {
        if (_destroy) return _destroyNotice()

        if (!keyMap || $type(keyMap) != OBJECT) return
        var changes = []
        $util.objEach(keyMap, function (key, item) {
            var cg = _$set(key, item, true)
            if (cg) changes.push(cg)
        })
        changes.forEach(function (args) {
            _emitChange.apply(null, args)
        })
    }

    /**
     *  create a prop observer if not in observer, 
     *  return true if no value setting.
     *  @param prop <String> property name
     *  @param value property value
     */
    function _$add(prop, value, lazyEmit) {
        if (prop.match(/[\.\[\]]/)) {
            throw new Error('Propname shoudn\'t contains "." or "[" or "]"')
        }

        if ($indexOf(_observableKeys, prop)) {
            // If value is specified, reset value
            return arguments.length > 1 ? true : false
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
        if (!lazyEmit) {
            _emitChange(prop, value)
        } else {
            return {
                kp: prop,
                vl: value
            }
        }
    }

    /**
     *  define computed prop/props of this model
     *  @param propname <String> property name
     *  @param deps <Array> computed property dependencies
     *  @param get <Function> computed property getter
     *  @param set <Function> computed property setter
     *  @param enumerable <Boolean> whether property enumerable or not
     */
    function _$computed (propname, deps, getFn, setFn, enumerable) {
        /**
         *  property is exist
         */
        if ($indexOf(_computedKeys, propname)) return

        _computedKeys.push(propname)
        _computedProps[propname] = {
            'deps': deps, 
            'get': getFn,
            'set': setFn
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
        var dest = _cptCaches[propname]
        dest.cur = getFn ? getFn.call(_computedCtx, model):undefined

        $util.def(model, propname, {
            enumerable: enumerable === undefined ? true : !!enumerable,
            get: function () {
                return dest.cur
            },
            set: function () {
                setFn && setFn.apply(_computedCtx, arguments)
            }
        })
        // emit change event when define
        _emitChange(propname, dest.cur)
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
    _defPrivateProperty('$add', function(/* [propname [, defaultValue]] | propnameArray | propsObj */) {
        var args = arguments
        var first = args[0]
        var pn, pv

        switch($type(first)) {
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
                $warn('Unexpect params')
        }
        return this
    })
    _defPrivateProperty('_$add', function (prop, value, lazyEmit) {
        var result = _$add(prop, value, !!lazyEmit)
        if (result === true) {
            return _$set(prop, value, !!lazyEmit)
        }
        return result
    })
    /**
     *  define computed prop/props
     *  @param propname <String> property name
     *  @param deps <Array> computed property dependencies
     *  @param getFn <Function> computed property getter
     *  @param setFn <Function> computed property setter
     *  @param enumerable <Boolean> Optional, whether property enumerable or not
     *  --------------------------------------------------
     *  @param propsObj <Object> define multiple properties
     */
    _defPrivateProperty('$computed', function (propname/*, deps, getFn, setFn, enumerable | [propsObj]*/) {
        if ($type(propname) == STRING) {
            _$computed.apply(null, arguments)
        } else if ($type(propname) == OBJECT) {
            $util.objEach(arguments[0], function (pn, pv /*propname, propnamevalue*/) {
                _$computed(pn, pv.deps, pv.get, pv.set, pv.enum)
            })
        } else {
            $warn('$computed params show be "(String, Array, Function, Function)" or "(Object)"')
        }
        return this
    })
    /**
     *  subscribe prop change
     *  change prop/props value, it will be trigger change event
     *  @param kp <String>
     *  ---------------------
     *  @param kpMap <Object>
     */
    _defPrivateProperty('$set', function( /*[kp, value] | [kpMap]*/ ) {
        var args = arguments
        var len = args.length
        if (len >= 2 || (len == 1 && $type(args[0]) == STRING)) {
            return _$set(args[0], args[1])
        } else if (len == 1 && $type(args[0]) == OBJECT) {
            return _$setMulti(args[0])
        } else {
            $warn('Unexpect $set params')
        }
    })
    _defPrivateProperty('_$set', function(key, value, lazyEmit) {
        return _$set(key, value, !!lazyEmit)
    })
    /**
     *  Get property value by name, using for get value of computed property without cached
     *  change prop/props value, it will be trigger change event
     *  @param kp <String> keyPath
     */
    _defPrivateProperty('$get', function(kp) {
        if ($indexOf(_observableKeys, kp)) 
            return _props[kp]
        else if ($indexOf(_computedKeys, kp)) {
            return (_computedProps[kp].get || NOOP).call(_computedCtx, model)
        } else {
            // keyPath
            var normalKP = $normalize(kp)
            var parts = normalKP.split('.')
            if (!$indexOf(_observableKeys, parts[0])) {
                return
            } else {
                return $keypath.get(_props, normalKP)
            }
        }
    })
    /**
     *  if params is (key, callback), add callback to key's subscription
     *  if params is (callback), subscribe any prop change events of this model
     *  @param key <String> optional
     *  @param callback <Function>
     */
    _defPrivateProperty('$watch', function( /*[key, ]callback*/ ) {
        var args = arguments
        var len = args.length
        var first = args[0]
        var key, callback
        if (len >= 2) {
            key = CHANGE_EVENT + ':' + $normalize($join(_rootPath(), first))
            callback = args[1]
        } else if (len == 1 && $type(first) == FUNCTION) {
            key = '*'
            callback = first
        } else {
            $warn('Unexpect $watch params')
            return NOOP
        }
        emitter.on(key, callback, __muxid__/*scopre*/)
        var that = this
        // return a unsubscribe method
        return function() {
            that.$unwatch.apply(that, args)
        }
    })
    /**
     *  unsubscribe prop change
     *  if params is (key, callback), remove callback from key's subscription
     *  if params is (callback), remove all callbacks from key's subscription
     *  if params is empty, remove all callbacks of current model
     *  @param key <String>
     *  @param callback <Function>
     */
    _defPrivateProperty('$unwatch', function( /*[key, ] [callback] */ ) {
        var args = arguments
        var len = args.length
        var first = args[0]
        var params
        var prefix
        switch (true) {
            case (len >= 2):
                params = [args[1]]
            case (len == 1 && $type(first) == STRING):
                !params && (params = [])
                prefix = CHANGE_EVENT + ':' + $normalize($join(_rootPath(), first))
                params.unshift(prefix)
                break
            case (len == 1 && $type(first) == FUNCTION):
                params = ['*', first]
                break
            case (len === 0):
                params = []
                break
            default:
                $warn('Unexpect param type of ' + first)
        }
        if (params) {
            params.push(__muxid__)
            emitter.off.apply(emitter, params)
        }
        return this
    })
    /**
     *  Return all properties without computed properties
     *  @return <Object>
     */
    _defPrivateProperty('$props', function() {
        return $util.copyObject(_props)
    })
    /**
     *  Reset event emitter
     *  @param em <Object> emitter
     */
    _defPrivateProperty('$emitter', function (em, _pem) {
        // return emitter instance if args is empty, 
        // for share some emitter with other instance
        if (arguments.length === 0) return emitter
        emitter = em
        _walkResetEmiter(this.$props(), em, _pem)
        return this
    })
    /**
     *  set emitter directly
     */
    _defPrivateProperty('_$emitter', function (em) {
        emitter = em
    })
    /**
     *  set private emitter directly
     */
    _defPrivateProperty('_$_emitter', function (em) {
        instanceOf(em, $Message) && (_emitter = em)
    })
    /**
     *  Call destroy will release all private properties and variables
     */
    _defPrivateProperty('$destroy', function () {
        // clean up all proto methods
        $util.objEach(_privateProperties, function (k, v) {
            if ($type(v) == FUNCTION && k != '$destroyed') _privateProperties[k] = _destroyNotice
        })

        if (!_isExternalEmitter) emitter.off()
        else emitter.off(__muxid__)

        if (!_isExternalPrivateEmitter) _emitter.off()
        else _emitter.off(__muxid__)

        emitter = null
        _emitter = null
        _computedProps = null
        _computedKeys = null
        _cptDepsMapping = null
        _cptCaches = null
        _observableKeys = null
        _props = null

        // destroy external flag
        _destroy = true
    })
    /**
     *  This method is used to check the instance is destroyed or not
     */
    _defPrivateProperty('$destroyed', function () {
        return _destroy
    })
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
    if ($type(ins) == OBJECT) {
        var items = ins
        if (instanceOf(ins, Mux)) {
            ins._$emitter(em, _pem)
            items = ins.$props()
        }
        $util.objEach(items, function (k, v) {
            _walkResetEmiter(v, em, _pem)
        })
    } else if ($type(ins) == ARRAY) {
        ins.forEach(function (v) {
            _walkResetEmiter(v, em, _pem)
        })
    }
}

function NOOP() {}
function instanceOf(a, b) {
    return a instanceof b
}

module.exports = Mux
