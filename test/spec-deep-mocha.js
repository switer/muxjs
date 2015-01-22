'use strict';

module.exports = function (Mux, assert) {
    var vm = new Mux({
        deep: true,
        props: {
            person: {name: 'switer'},
            comments: [{title: 'hello'}, 1]
        }
    })
    describe('[deep]', function () {
        it('change subproperty using $set',function (done) {
            vm.$unwatch()
            vm.$watch('person.title', function (next, pre) {
                assert.equal(next, 'hello')
                done()
            })
            vm.$set('person.title', 'hello')
        })
        it('change sub array property using $set',function (done) {
            vm.$unwatch()
            vm.$watch('comments[0].title', function (next, pre) {
                assert.equal(next, 'world')
                done()
            })
            vm.$set('comments[0].title', 'world')
        })
        it('change sub array items using push',function (done) {
            vm.$unwatch()
            vm.$watch('comments', function (next, pre) {
                assert.equal(next.length, 3)
                done()
            })
            vm.comments.push(2)
        })
        it('change sub array items using pop',function (done) {
            vm.$unwatch()
            vm.$watch('comments', function (next, pre) {
                assert.equal(next.length, 2)
                done()
            })
            vm.comments.pop()
        })
        it('change array property\'s item value',function (done) {
            vm.$unwatch()
            vm.$watch('comments[0].title', function (next, pre) {
                assert.equal(next, 'say')
                assert.equal(pre, 'world')
                done()
            })
            vm.comments[0].title = 'say'
        })
        it('create a new property',function (done) {
            vm.$unwatch()
            vm.$watch('person.email', function (next, pre) {
                assert.equal(next, 'guankaishe@gmail.com')
                assert.equal(pre, undefined)
                done()
            })
            vm.$set('person.email', 'guankaishe@gmail.com')
        })
    })
}