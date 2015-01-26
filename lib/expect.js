'use strict';

/**
 *  Expect condition is truely
 *  @param cnd <Boolean>
 *  @param msg <String> *optional*
 */
function expect(cnd, msg) {
    if (!cnd) throw new Error(msg || 'Unexpect error')
}
module.exports = expect
