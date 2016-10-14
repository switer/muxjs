'use strict';

module.exports = function (Mux, assert) {
    var Comment = Mux.extend({
        props: function () {
            return {
                title: 'comment to me',
                author: 'switer',
                replyUsers: []
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
    var comment = new Comment()
    
    describe('[props]', function () {
        it('Default property\'s value is correct', function () {
            assert.equal(comment.title, 'comment to me')
        })
        it('Set value using dot access', function () {
            comment.title = 'abc'
            assert.equal(comment.title, 'abc')
        })
        it('Set value using [] access', function () {
            comment['title'] = 123
            assert.equal(comment.title, 123)
        })
        it('Using "=" operator to set property to an unobserved property to model object', function () {
            comment.replies123 = true
            assert.equal(comment.replies123, true)
        })
    })
    describe('[computed]', function () {
        it('Default replies is 0', function () {
            assert.equal(comment.replies, 0)
        })
        it('Using "=" operator to set property to a computed value', function () {
            comment.replies = 10
            assert.equal(comment.replies, 0)
        })
        it('Callback When dependenies change', function (done) {
            assert.equal(comment.replies, 0)
            comment.$unwatch()
            comment.$watch('replies', function () {
                assert.equal(comment.replies, 1)
                done()
            })
            comment.replyUsers.push(1)
        })
        it('Define computed setter', function () {
            var mux = new Mux({
                props: {
                    count: 0
                },
                computed:  {
                    replies: {
                        deps: ['count'],
                        get: function () {
                            return this.count
                        },
                        set: function (v) {
                            this.count = v
                        }
                    }
                }
            })
            assert.equal(mux.replies, 0)
            mux.replies = 2
            assert.equal(mux.replies, 2)
        })
    })
    describe('[emitter]', function () {
        it('Passing custom emitter', function (done) {
            var em = Mux.emitter()
            var initChange = false
            em.on('change:name', function () {
                initChange = true
            })
            var mux = new Mux({
                emitter: em,
                props: {
                    name: '',
                    email: ''
                }
            })
            mux.name = '123'
            em.on('change:email', function (next) {
                assert(initChange)
                assert.equal(next, 'guankaishe@gmail.com')
                done()
            })
            mux.email = 'guankaishe@gmail.com'
        })
    })
}