'use strict';

module.exports = function (Mux, assert) {
    
    var vm = new Mux({
        props: {
            person: {name: 'switer'},
            comments: [{title: 'hello'}, 1]
        }
    })
    var vm2 = new Mux({
        props: {
            person: {}
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
        it('use \'=\' to append new property will not trigger change event',function () {
            vm.$unwatch()
            vm.$watch('person.address', function (next, pre) {
                assert.equal(false)
            })
            vm.person.address =  'china'
        })
        it('move property',function (done) {
            vm.$unwatch()
            vm.$watch('person.comments', function (next, pre) {
                assert.equal(next.length, vm.comments.length)
                done()
            })
            vm.$set('person.comments', vm.comments)
        })
        it('move property to another instance',function (done) {
            vm2.$unwatch()
            var step1
            vm2.$watch('person.comments', function (next, pre) {
                assert.equal(next.length, vm2.person.comments.length)
                step1 = true
            })
            vm.$watch('person.comments', function (next, pre) {
                assert(false)
            })
            vm.$watch('comments', function (next, pre) {
                assert.equal(next.length, 3)
                step1 && done()
            })
            vm2.$set('person.comments', vm.comments)
            vm2.person.comments.push('switer')
            vm.comments.push(1)
        })
        it('selft property',function (done) {
            vm.$unwatch()
            vm.$watch('person.parent', function (next, pre) {
                assert(next)
                done()
            })
            vm.$set('person.parent', vm)
        })
    })
}