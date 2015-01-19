'use strict';

module.exports = function (Mux, test) {
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
    var person = new Mux({
        name: 'switer',
        github: 'https://github.com/switer'
    })
    var comment = new Comment()

    test('props', function (t) {
        t.plan(4)
        t.equal(comment.title, 'comment to me')
        comment.title = 'abc'
        t.equal(comment.title, 'abc')
        comment['title'] = 123
        t.equal(comment.title, 123)
        t.equal(comment.unobserved, undefined)
    })
    test('computed', function (t) {
        t.plan(3)
        t.equal(comment.replies, 0)
        comment.$set('replies123', true)
        t.notEqual(comment.replies123, true)
        comment.replies123 = true
        t.equal(comment.replies123, true)
    })
    test('$set && $watch && $unwatch', function (t) {
        t.test('Get value after set value immediately', function (st) {
            st.plan(1)
            comment.$set('title', 'comment to that')
            st.equal(comment.title, 'comment to that')
        })
        t.test('Change callback after set', function (st) {
            st.plan(3)
            comment.$watch('title', function (next, pre) {
                st.equal(pre, 'comment to that')
                st.equal(next, 'comment to this')
                st.equal(comment.title, 'comment to this')
            })
            comment.$set('title','comment to this')
        })
        t.test('Unwatch last and watch again', function (st) {
            st.plan(5)
            var count = 0
            comment.$unwatch('title')
            comment.$set('title', 'comment to that')
            st.equal(comment.title, 'comment to that')
            comment.$watch('title', function (next, pre) {
                st.equal(++count, 1)
                st.equal(pre, 'comment to that')
                st.equal(next, 'comment to this')
                st.equal(comment.title, 'comment to this')
            })
            comment.$set('title','comment to this')
        })
        t.test('Watch computed property change', function (st) {
            st.plan(1)
            comment.$watch('replies', function () {
                st.equal(this.replies, 2)
            })
            comment.$set('replyUsers', [1,2])
        })
        t.test('Unwatch computed property then watch again', function (st) {
            st.plan(1)
            comment.$unwatch('replies')
            comment.$watch('replies', function () {
                st.equal(this.replies, 3)
            })
            comment.$set('replyUsers', [1,2,3])
        })
        t.test('Watch any properties change', function (st) {
            st.plan(1)
            comment.$unwatch()
            comment.$watch(function () {
                st.equal(this.replies, 2)
            })
            comment.$set('replyUsers', [1,2])
        })
        t.test('Set multiple props', function (st) {
            st.plan(3)
            var count = 0
            comment.$unwatch()
            comment.$watch(function () {
                st.equal(++count, 1)
            })
            var c2 = 0
            comment.$watch(function () {
                st.equal(++c2, 1)
            })
            comment.$set({
                title: 'reset comment',
                author: 'mux.js'
            })
            st.equal(comment.author, 'mux.js')
        })
    })
    test('$add', function (t) {
        t.test('observe a property', function (st) {
            st.plan(2)
            comment.$unwatch()
            comment.$add('new')
            comment.$watch('new', function () {
                st.pass()
            })
            comment.$set('new', 'new property')
            st.equal(comment.new, 'new property')
        })
        t.test('observe multiple properties', function (st) {
            st.plan(4)
            comment.$unwatch()
            comment.$add('prop1', 'prop2')
            comment.$watch('prop1', function (next, pre) {
                st.equal(next, 'new property 1')
            })
            comment.$watch('prop2', function (next, pre) {
                st.equal(next, 'new property 2')
            })
            comment.$set('prop1', 'new property 1')
            comment.$set('prop2', 'new property 2')
            st.equal(comment['prop1'], 'new property 1')
            st.equal(comment['prop2'], 'new property 2')
        })
    })
    test('$computed', function (t) {
        t.test('Define a computed property', function (st) {
            st.plan(1)
            comment.$unwatch()
            comment.$computed('computed1', ['title'], function () {
                return 'Say:' + this.title
            })
            comment.$watch('computed1', function () {
                st.equal(this.computed1, 'Say:hello')
            })
            comment.title = 'hello'
        })
        t.test('Define multiple computed properties', function (st) {
            st.plan(3)
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
                st.equal(this.computed2, 'Guankaishe say:world')
            })
            comment.$watch('computed3', function () {
                st.equal(this.computed3, 'Switer say:world')
            })
            comment.title = 'world'
            st.equal(comment.computed2, 'Guankaishe say:world')
        })
    })
}
