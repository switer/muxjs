'use strict';

/**
 *  normalize all access ways into dot access
 *  @example "person.books[1].title" --> "person.books.1.title"
 */
function _keyPathNormalize(kp) {
    return new String(kp).replace(/\[([^\[\]])+\]/g, function(m, k) {
        return '.' + k
    })
}
/**
 *  set value to object by keypath
 */
function _set(obj, keypath, value) {
    var parts = _keyPathNormalize(keypath).split('.')
    var last = parts.pop()
    var dest = obj
    parts.forEach(function(key) {
        // Still set to non-object, just throw that error
        dest = dest[key]
    })
    dest[last] = value
    return obj
}
/**
 *  get value of object by keypath
 */
function _get(obj, keypath) {
    var parts = _keyPathNormalize(keypath).split('.')
    var dest = obj
    parts.forEach(function(key) {
        // Still set to non-object, just throw that error
        dest = dest[key]
    })
    return dest
}

module.exports = {
    normalize: _keyPathNormalize,
    set: _set,
    get: _get
}
