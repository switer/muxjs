'use strict';

module.exports = function (Mux, assert) {
    Mux.config({
        warn: false
    })
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
                fn: function () {
                    return this.replyUsers.length
                }
            }
        }
    })
    var comment = new Comment()

    describe('contructor', function () {
        var person = new Mux({
            props: function () {
                return {
                    name: 'switer',
                    github: 'https://github.com/switer'
                }
            },
            computed: {
                nameLength: {
                    deps: ['name'],
                    fn: function () {
                        return this.name.length
                    }
                }
            }
        })
        var another = new Mux({
            props: {
                name: 'guankaishe',
                email: 'guankaishe@gmail.com'
            }
        })
        it('Properties is correct when using Mux instance', function () {
            assert.equal(person['name'], 'switer')
            assert.equal(person.github, 'https://github.com/switer')
            assert.equal(person['nameLength'], 6)
        })
        it('Properties is correct when using Mux instance and props is an object', function () {
            assert.equal(another['name'], 'guankaishe')
            assert.equal(another.email, 'guankaishe@gmail.com')
        })

    })
    describe('props', function () {
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
        it('Array .push() hook', function (done) {
            comment.$unwatch()
            comment.$watch('replyUsers', function (next, pre) {
                assert.equal(pre.length, 0)
                assert.equal(next.length, 1)
                done()
            })
            comment.replyUsers.push(1)
        })
        it('Array .pop() hook', function (done) {
            comment.$unwatch()
            comment.$watch('replyUsers', function (next, pre) {
                assert.equal(pre.length, 1)
                assert.equal(next.length, 0)
                done()
            })
            comment.replyUsers.pop()
        })
        it('Array .unshift() hook', function (done) {
            comment.$unwatch()
            comment.$watch('replyUsers', function (next, pre) {
                assert.equal(pre.length, 0)
                assert.equal(next.length, 1)
                done()
            })
            comment.replyUsers.unshift(2)
        })
        it('Array .shift() hook', function (done) {
            comment.$unwatch()
            comment.$watch('replyUsers', function (next, pre) {
                assert.equal(pre.length, 1)
                assert.equal(next.length, 0)
                done()
            })
            comment.replyUsers.shift()
        })
    })
    describe('computed', function () {
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

    })
    describe('$set && $watch && $unwatch', function () {
        it('Get value after set value immediately', function () {
            comment.$set('title', 'comment to that')
            assert.equal(comment.title, 'comment to that')
        })
        it('Set value to an unobserved property using $set', function () {
            comment.$set('unknow', 'unknow')
            assert.equal(comment.unknow, undefined)
        })
        it('Set value to a computed property using $set', function () {
            comment.$set('replies', 100)
            assert.notEqual(comment.replies, 100)
        })
        it('Change callback after set', function (done) {
            comment.$watch('title', function (next, pre) {
                assert.equal(pre, 'comment to that')
                assert.equal(next, 'comment to this')
                assert.equal(comment.title, 'comment to this')
                done()
            })
            comment.$set('title','comment to this')
        })
        it('Unwatch last and watch again', function (done) {
            var count = 0
            comment.$unwatch('title')
            comment.$set('title', 'comment to that')
            assert.equal(comment.title, 'comment to that')
            comment.$watch('title', function (next, pre) {
                assert.equal(++count, 1)
                assert.equal(pre, 'comment to that')
                assert.equal(next, 'comment to this')
                assert.equal(comment.title, 'comment to this')
                done()
            })
            comment.$set('title','comment to this')
        })
        it('Watch computed property change', function (done) {
            comment.$unwatch()
            comment.$watch('replies', function () {
                assert.equal(this.replies, 2)
                done()
            })
            comment.replyUsers = [1,2]
        })
        it('Unwatch computed property then watch again', function (done) {
            comment.$unwatch('replies')
            comment.$watch('replies', function () {
                assert.equal(this.replies, 3)
                done()
            })
            comment.$set('replyUsers', [1,2,3])
        })
        it('Watch any properties change', function (done) {
            comment.$unwatch()
            comment.$watch(function () {
                assert.equal(this.replies, 2)
                done()
            })
            comment.$set('replyUsers', [1,2])
        })
        it('Set multiple props', function (done) {
            var count = 0
            comment.$unwatch()
            comment.title = ''
            comment.replyUsers = []
            function allCb (nextProp, preProp) {
                count ++
                assert.equal(nextProp.title, 'reset comment')
                assert.equal(preProp.title, '')
                assert.equal(nextProp.replies, 6)
                assert.equal(preProp.replies, 0)
                _done()
            }
            function titleCb (next, pre) {
                assert.equal(next, 'reset comment')
                assert.equal(pre, '')
                count ++
                _done()
            }
            function repliesCb (next, pre) {
                assert.equal(next, 6)
                assert.equal(this.replies, 6)
                count ++
                _done()
            }
            function _done () {
                if (count >= 3) {
                    done()
                    comment.$unwatch('title', titleCb)
                    comment.$unwatch('replies', repliesCb)
                    comment.$unwatch(allCb)
                }
            }
            comment.$watch(allCb)
            comment.$watch('title', titleCb)
            comment.$watch('replies', repliesCb)
            comment.$set({
                title: 'reset comment',
                author: 'mux.js',
                replyUsers: [1,2,3,4,5,6]
            })
        })
        it('Set value by keyPath', function (done) {
            comment.$unwatch()
            comment.replyUsers = [{
                author: 'danyan',
                comment: 'test'
            }]
            comment.$watch('replyUsers', function () {
                assert.equal(this.replyUsers[0].comment, 'test update')
                done()
            })
            comment.$set('replyUsers[0].comment', 'test update')

        })
        it('Set multiple value by keyPath', function (done) {
            comment.$unwatch()
            comment.replyUsers = [{
                author: 'danyan'
            }, {
                author: 'test-user'
            }]
            comment.post = {
                replyUsers: [{
                    author: '*'
                }]
            }
            comment.$watch('replyUsers', function () {
                assert.equal(this.replyUsers[1].comment, 'test2')
                done()
            })
            comment.$watch('post', function () {
                assert.equal(this.post.replyUsers[0].comment, 'nothing')
                done()
            })
            comment.$set('replyUsers[1].comment', 'test2')
            comment.$set('post.replyUsers[1].comment', 'nothing')

        })
    })
    describe('$get', function () {
        it('get property value correctly', function () {
            comment.$unwatch()
            comment.title = 'mux.js'
            comment.replyUsers = [1,2,3,4,5]
            assert.equal(comment.$get('title'), 'mux.js')
            assert.equal(comment.$get('replies'), 5)
        })
    })
    describe('$add', function () {
        it('observe a property', function () {
            comment.$unwatch()
            comment.$add('new')
            comment.$watch('new', function (next, pre) {
                assert.equal(next, 'new property')
            })
            comment.$set('new', 'new property')
            assert.equal(comment.new, 'new property')
        })
        it('observe multiple properties', function (done) {
            comment.$unwatch()
            comment.$add('prop1', 'prop2')
            comment.$watch('prop1', function (next, pre) {
                assert.equal(next, 'new property 1')
            })
            comment.$watch('prop2', function (next, pre) {
                assert.equal(next, 'new property 2')
                done()
            })
            comment.$set('prop1', 'new property 1')
            comment.$set('prop2', 'new property 2')
            assert.equal(comment['prop1'], 'new property 1')
            assert.equal(comment['prop2'], 'new property 2')
        })
    })
    describe('$computed', function (t) {
        it('Define a computed property', function (done) {
            comment.$unwatch()
            comment.$computed('computed1', ['title'], function () {
                return 'Say:' + this.title
            })
            comment.$watch('computed1', function () {
                assert.equal(this.computed1, 'Say:hello')
                done()
            })
            comment.title = 'hello'
        })
        it('Define multiple computed properties', function (done) {
            comment.$unwatch()
            comment.$computed({
                'computed2': {
                    deps:['title'], 
                    fn: function () {
                        return 'Guankaishe say:' + this.title
                    }
                },
                'computed3': {
                    deps:['title'], 
                    fn: function () {
                        return 'Switer say:' + this.title
                    }
                }
            })
            comment.$watch('computed2', function () {
                assert.equal(this.computed2, 'Guankaishe say:world')
            })
            comment.$watch('computed3', function () {
                assert.equal(this.computed3, 'Switer say:world')
                done()
            })
            comment.title = 'world'
            assert.equal(comment.computed2, 'Guankaishe say:world')
        })
    })

}
