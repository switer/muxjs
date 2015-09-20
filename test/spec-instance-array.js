module.exports = function (Mux, assert) {

    var Comment = Mux.extend({
        props: function () {
            return {
                title: 'comment to me',
                author: 'switer',
                replyUsers: [0],
                arr2d: [[{name: 1}]]
            }
        },
        computed:  {
            replies: {
                deps: ['replyUsers'],
                get: function () {
                    return this.replyUsers.length
                }
            }
        }
    })
    describe('[Array]', function () {
        it('Array .push() hook', function (done) {
            var comment = new Comment()
            comment.$watch('replyUsers', function (next, pre, method) {
                assert.equal(method, 'push')
                assert.equal(pre.length, 1)
                assert.equal(next.length, 2)
                done()
            })
            comment.replyUsers.push(1)
        })
        it('Array .push() hook*2', function (done) {
            var comment = new Comment()
            comment.$watch(function (kp, next, pre, method) {
                assert.equal(kp, 'arr2d.0')
                assert.equal(method, 'push')
                done()
            })
            comment.arr2d[0].push({name: 2})
        })
        it('Array .pop() hook', function (done) {
            var comment = new Comment()
            comment.$watch('replyUsers', function (next, pre, method) {
                assert.equal(method, 'pop')
                assert.equal(pre.length, 1)
                assert.equal(next.length, 0)
                done()
            })
            comment.replyUsers.pop()
        })
        it('Array .pop() hook*2', function (done) {
            var comment = new Comment()
            comment.$watch(function (kp, next, pre, method) {
                assert.equal(kp, 'arr2d.0')
                assert.equal(method, 'pop')
                done()
            })
            comment.arr2d[0].pop()
        })
        it('Array .unshift() hook', function (done) {
            var comment = new Comment()
            comment.$watch('replyUsers', function (next, pre, method) {
                assert.equal(method, 'unshift')
                assert.equal(pre.length, 1)
                assert.equal(next.length, 2)
                done()
            })
            comment.replyUsers.unshift(2)
        })
        it('Array .unshift() hook*2', function (done) {
            var comment = new Comment()
            comment.$watch(function (kp, next, pre, method) {
                assert.equal(kp, 'arr2d.0')
                assert.equal(method, 'unshift')
                done()
            })
            comment.arr2d[0].unshift()
        })
        it('Array .shift() hook', function (done) {
            var comment = new Comment()
            comment.$watch('replyUsers', function (next, pre, method) {
                assert.equal(method, 'shift')
                assert.equal(pre.length, 1)
                assert.equal(next.length, 0)
                done()
            })
            comment.replyUsers.shift()
        })
        it('Array .shift() hook*2', function (done) {
            var comment = new Comment()
            comment.$watch(function (kp, next, pre, method) {
                assert.equal(kp, 'arr2d.0')
                assert.equal(method, 'shift')
                done()
            })
            comment.arr2d[0].shift()
        })
        it('Array .reverse() hook', function (done) {
            var comment = new Comment()
            comment.$add('nums', [1,2,3,4])
            comment.$watch('nums', function (next, pre, method) {
                assert.equal(method, 'reverse')
                assert.equal(next[0], 4)
                assert.equal(next[1], 3)
                assert.equal(next[2], 2)
                assert.equal(next[3], 1)
                done()
            })
            comment.nums.reverse()
        })
        it('Array .reverse() hook*2', function (done) {
            var comment = new Comment()
            comment.$watch(function (kp, next, pre, method) {
                assert.equal(kp, 'arr2d.0')
                assert.equal(method, 'reverse')
                done()
            })
            comment.arr2d[0].reverse()
        })
        it('Array .$concat() hook', function (done) {
            var comment = new Comment()
            comment.$add('nums', [1,2])
            comment.$watch('nums', function (next, pre, method) {
                assert.equal(method, '$concat')
                assert.equal(next[2], 3)
                assert.equal(next[3], 4)
                done()
            })
            comment.nums.$concat(3, [4])
        })
        it('Array .$concat() hook*2', function (done) {
            var comment = new Comment()
            comment.$watch(function (kp, next, pre, method) {
                assert.equal(kp, 'arr2d.0')
                assert.equal(method, '$concat')
                assert.equal(next.length, 2)
                done()
            })
            comment.arr2d[0].$concat([{name: 2}])
        })
    })
}