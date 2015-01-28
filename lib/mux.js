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
    var proto = {
        '__muxid__': allotId()
    }
    $util.insertProto(model, proto)

    /**
     *  return current keypath prefix of this model
     */
    function _rootPath () {
        return model.__kp__ || ''
    }

    var getter = options.props

    /**
     *  Get initial props from options
     */
    var _initialProps = {}
    if ($util.type(getter) == 'function') {
        _initialProps = getter()
    } else if ($util.type(getter) == 'object') {
        _initialProps = getter
    }

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
        _$computed(pn, def.deps, def.fn)
    })
    _initialComputedProps = null


    /**
     *  local proxy for EventEmitter
     */
    function _emitChange(propname/*, arg1, ..., argX*/) {
        var args = arguments
        var evtArgs = $util.copyArray(args)
        var kp = $keypath.join(_rootPath(), propname)

        args[0] = 'change:' + kp
        _emitter.emit('change', kp)
        emitter.emit.apply(emitter, args)

        evtArgs[0] = kp
        evtArgs.unshift('*')
        emitter.emit.apply(emitter, evtArgs)
    }
    /**
     *  batch emit computed property change
     */
    _emitter.on('change', function (kp) {
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
            var pre = _cptCaches[ck].pre = _cptCaches[ck].current
            var next = _cptCaches[ck].current = (_computedProps[ck].fn || NOOP).call(model, model)

            if ($util.diff(next, pre)) _emitChange(ck, next, pre)
        })
    })
    /**
     *  Add dependence to "_cptDepsMapping"
     *  @param propname <String> property name
     *  @param dep <String> dependency name
     */
    function _prop2CptDepsMapping (propname, dep) {
        if (~_computedKeys.indexOf(dep)) 
           return $info.warn('Dependency should not computed property')

        $util.patch(_cptDepsMapping, dep, [])
        if (~_cptDepsMapping[dep].indexOf(propname)) return
        _cptDepsMapping[dep].push(propname)
    }
    /**
     *  Instance or reuse a sub-mux-instance with specified keyPath and emitter
     *  @param target <Object> instance target, it could be a Mux instance
     *  @param props <Object> property value that has been walked
     *  @param kp <String> keyPath of target, use to diff instance keyPath changes or instance with the keyPath
     */
    function _subInstance (target, props, kp) {

        var ins
        if (target instanceof Mux && target.__kp__ == kp && target.__root__ == model.__muxid__) {
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
                _emitter: _emitter
            })
        }
        if (ins.__root__ == undefined) {
            $util.def(ins, '__root__', {
                enumerable: false,
                value: model.__muxid__
            })
        }
        if (ins.__kp__ == undefined) {
            $util.def(ins, '__kp__', {
                enumerable: false,
                value: kp
            })
        } else if (ins.__kp__ != kp) {
            ins.__kp__ = kp
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
        if (tov == 'array') {
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
            case 'object': 
                // walk deep into object items
                var props = {}
                var obj = value
                if (value instanceof Mux) obj = value.$props()
                $util.objEach(obj, function (k, v) {
                    props[k] = _walk(k, v, $keypath.join(kp, k))
                })
                return _subInstance(value, props, kp)
            case 'array':
                // walk deep into array items
                value.forEach(function (item, index) {
                    item = _walk(index, item, $keypath.join(kp, index))
                    $util.def(value, index, {
                        enumerable: true,
                        get: function () {
                            return item
                        },
                        set: function (v) {
                            var pv = item
                            var mn = $keypath.join(name, index) // mounted property name
                            item = _walk(index, v, $keypath.join(kp, index))
                            _emitChange(mn, item, pv)
                        }
                    })
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

        $keypath.set(_props, kp, value, function (tar, key, v) {
            v = $util.copyValue(value)
            if (tar instanceof Mux) {
                if (tar.hasOwnProperty(key)) {
                    tar.$set(key, v)
                } else {
                    tar.$add(key, v)
                }
            } else {
                tar[key] = v
            }
        })
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

        if (!keyMap || $util.type(keyMap) != 'object') return
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
     */
    function _$computed (propname, deps, fn) {
        switch (false) {
            case ($util.type(propname) == 'string'): 
                $info.warn('Propname\'s should be "String"')
            case ($util.type(deps) == 'array'): 
                $info.warn('"deps" should be "Array"')
            case ($util.type(fn) == 'function'):
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
            enumerable: true,
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
        var first = arguments[0]
        var pn, pv

        switch($util.type(first)) {
            case 'string':
                // with specified value or not
                pn = first
                if (arguments.length > 1) {
                    pv = arguments[1]
                    if (_$add(pn, pv)) {
                        _$set(pn, pv)
                    }
                } else {
                    _$add(pn)
                }
                break
            case 'array':
                // observe properties without value
                first.forEach(function (item) {
                    _$add(item)
                })
                break
            case 'object':
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
                info.warn('Unexpect params')
        }
        return this
    }
        /**
         *  define computed prop/props
         *  @param propname <String> property name
         *  @param deps <Array> computed property dependencies
         *  @param fn <Function> computed property getter
         *  --------------------------------------------------
         *  @param propsObj <Object> define multiple properties
         */
    proto.$computed = function (propname, deps, fn/* | [propsObj]*/) {

        if ($util.type(propname) == 'string') {

            _$computed(propname, deps, fn)
        } else if ($util.type(propname) == 'object') {

            $util.objEach(arguments[0], function (pn, pv/*propname, propnamevalue*/) {
                _$computed(pn, pv.deps, pv.fn)
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
        var len = arguments.length
        if (len >= 2 || (len == 1 && $util.type(arguments[0]) == 'string')) {
            _$set(arguments[0], arguments[1])
        } else if (len == 1 && $util.type(arguments[0]) == 'object') {
            _$setMulti(arguments[0])
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
        var len = arguments.length
        var key, callback

        if (len >= 2) {
            var prefix = _rootPath()
            prefix && (prefix += '.')
            key = 'change:' + arguments[0]
            callback = arguments[1]
        } else if (len == 1 && $util.type(arguments[0]) == 'function') {
            key = '*'
            callback = arguments[0]
        } else {
            $info.warn('Unexpect $watch params')
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
    /**
     *  unsubscribe prop change
     *  if params is (key, callback), remove callback from key's subscription
     *  if params is (callback), remove all callbacks from key' ubscription
     *  if params is empty, remove all callbacks of current model
     *  @param key <String>
     *  @param callback <Function>
     */
    proto.$unwatch = function( /*[key, ] [callback] */ ) {
        var len = arguments.length
        var args
        var prefix = _rootPath()
        if (len >= 2) {
            // key + callback
            prefix && (prefix += '.')
            args = ['change:' + prefix + arguments[0], arguments[1]]
        } else if (len == 1 && $util.type(arguments[0]) == 'string') {
            // key
            prefix && (prefix += '.')
            args = ['change:' + prefix + arguments[0]]
        } else if (len == 1 && $util.type(arguments[0]) == 'function') {
            // callback
            args = ['*', arguments[0]]
        } else if (len == 0) {
            // all
            args = []
        } else {
            $info.warn('Unexpect param type of ' + arguments[0])
        }
        if (args) {
            emitter.off.apply(emitter, args)
        }
        return this
    }
    /**
     *  Return all properties without computed properties
     *  @return <Object>
     */
    proto.$props = function() {
        return $util.copyObject(_props)
    }
    /**
     *  Reset event emitter
     *  @param em <Object> emitter
     */
    proto.$emitter = function (em, _pem) {
        emitter = em
        _isDeep && _walkResetEmiter(this.$props(), em, _pem)
        return this
    }
    /**
     *  set emitter directly
     */
    proto._$emitter = function (em) {
        emitter = em
    }
    /**
     *  set private emitter directly
     */
    proto._$_emitter = function (em) {
        em instanceof $Message && (_emitter = em)
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
    if ($util.type(ins) == 'object') {
        var items = ins
        if (ins instanceof Mux) {
            ins._$emitter(em, _pem)
            items = ins.$props()
        }
        $util.objEach(items, function (k, v) {
            _walkResetEmiter(v, em, _pem)
        })
    } else if ($util.type(ins) == 'array') {
        ins.forEach(function (v) {
            _walkResetEmiter(v, em, _pem)
        })
    }
}

function NOOP() {}

module.exports = Mux
