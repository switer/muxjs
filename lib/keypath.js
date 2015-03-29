'use strict';

/**
 *  normalize all access ways into dot access
 *  @example "person.books[1].title" --> "person.books.1.title"
 */
function _keyPathNormalize(kp) {
    return new String(kp).replace(/\[([^\[\]]+)\]/g, function(m, k) {
        return '.' + k.replace(/^["']|["']$/g, '')
    })
}
/**
 *  set value to object by keypath
 */
function _set(obj, keypath, value, hook) {
    var parts = _keyPathNormalize(keypath).split('.')
    var last = parts.pop()
    var dest = obj
    parts.forEach(function(key) {
        // Still set to non-object, just throw that error
        dest = dest[key]
    })
    if (hook) {
        // hook proxy set value
        hook(dest, last, value)
    } else {
        dest[last] = value
    }
    return obj
}
/**
 *  Get undefine
 */
function undf () {
    return void(0)
}
function isNon (o) {
    return o === undf() || o === null
}
/**
 *  get value of object by keypath
 */
function _get(obj, keypath) {
    var parts = _keyPathNormalize(keypath).split('.')
    var dest = obj
    parts.forEach(function(key) {
        if (isNon(dest)) return !(dest = undf())
        dest = dest[key]
    })
    return dest
}

/**
 *  append path to a base path
 */
function _join(pre, tail) {
    var _hasBegin = !!pre
    if(!_hasBegin) pre = ''
    if (/^\[.*\]$/.exec(tail)) return pre + tail
    else if (typeof(tail) == 'number') return pre + '[' + tail + ']'
    else if (_hasBegin) return pre + '.' + tail
    else return tail
}
/**
 *  remove the last section of the keypath
 *  digest("a.b.c") --> "a.b"
 */
function _digest(nkp) {
    var reg = /(\.[^\.]+|\[([^\[\]])+\])$/
    if (!reg.exec(nkp)) return ''
    return nkp.replace(reg, '')
}
module.exports = {
    normalize: _keyPathNormalize,
    set: _set,
    get: _get,
    join: _join,
    digest: _digest
}
