'use strict';

module.exports = function (Mux, assert) {
    describe('Base', function () {
        it('Set value', function (done) {
            var person = new Mux({
                props: function () {
                    return {
                        items: [1,2,3,4],
                    }
                }
            })
            person.$watch('items', function (nv) {
                assert.equal(nv.length, 0)
            })
            person.$watch(function (kp) {
                assert.equal(kp, 'items')
                done()
            })
            person.items = []
        })
        
    })
}