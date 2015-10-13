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
var _mid = 0

function allotId() {
    return 'mux_' + _mid ++
}
function Mux(parent) {
	this.id = allotId()
	this.parent = parent
}
qMux.prototype = new $Message

function MuxRoot() {
	this.id = allotId()
	this.parent = null
}
function MuxDecorator(obj, mux) {
	var _values = mux.values = {}
	Object.keys(obj).forEach(function (k) {
		_values[k] = obj[k]
		Object.defineProperty(obj, k, {
			enumerable: true,
			configurable: false, // can be deleted
			get: function () {
				return _values[k]
			},
			set: function (v) {
				_values[k] = v
				mux.emit('change', k, v)
			}
		})
	})
}
function MuxCreator (obj) {
	var mux
	var immutableObj = obj
	/**
	 * validate
	 */
	if (mux = obj.__mux__) {
		mux.parent = new MuxRoot()
		// immutable operate
		var immutableObj = {}
		Object.keys(obj).forEach(function (item) {

		})
	}
	
	/**
	 * Instance
	 */
	mux = new Mux()
	Object.defineProperty(obj, '__mux__', {
		enumerable: false,
		get: function () {
			return mux
		},
		set: function (m) {
			if (m instanceof Mux) {
				mux = m // never do that
			} else {
				$warn('Cant rewrite mux instance to a non-mux instance')
			}
		}
	})
	MuxDecorator(obj, mux)

	return immutableObj
}