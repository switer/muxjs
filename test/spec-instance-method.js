'use strict';

module.exports = function (Mux, assert) {

    var Comment = Mux.extend({
        deep: false,
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
            comment.$unwatch('title')
            comment.$set('title','comment to that')
            comment.$watch('title', function (next, pre) {
                assert.equal(next, 'comment to this')
                assert.equal(pre, 'comment to that')
                assert.equal(comment.title, 'comment to this')
                done()
            })
            comment.$set('title','comment to this')
        })
        it('Unwatch by watch return method', function () {
            comment.$unwatch('title')
            var unwatch = comment.$watch('title', function (next, pre) {
                assert(false)
            })
            unwatch()
            comment.$set('title','no callback')
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
            comment.$watch(function (propname, next) {
                if (propname == 'replyUsers') {
                    assert.equal(this.replyUsers.length, 2)
                }
                if (propname == 'replies') {
                    assert.equal(this.replies, 2)
                    done()
                }
            })
            comment.$set('replyUsers', [1,2])
        })
        it('Set multiple props', function (done) {
            comment.$unwatch()
            var count = 0
            comment.title = ''
            comment.replyUsers = []
            function allCb (propname, next, pre) {
                count ++
                if (propname == 'title') {
                    assert.equal(next, 'reset comment')
                    assert.equal(pre, '')
                } else if (propname == 'replies') {
                    assert.equal(next, 6)
                    assert.equal(pre, 0)
                }
                _done('allCb')
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
                _done('repliesCb')
            }
            function _done () {
                if (count >= 6) {
                    comment.$unwatch('title', titleCb)
                    comment.$unwatch('replies', repliesCb)
                    comment.$unwatch(allCb)
                    done()
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
        it('Set array item\'s value use $set', function (done) {
            var a = new Mux({
                props: {
                    items: [1]
                }
            })
            a.$watch('items[0]', function (next) {
                assert.equal(next, 2)
                done()
            })
            a.$set('items[0]', 2)
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
        it('keyPath normalize', function (done) {
            var a = new Mux({
                props: {
                    items: [{
                        comment: {
                            title: 'hello'
                        },
                        post: [{
                            content: 'world'
                        }]
                    }]
                }
            })
            var step1
            var step2
            function _done () {
                step1 && step2 && done()
            }
            a.$watch('items[0].comment["title"]', function (next) {
                step1 = true
                _done()
            })
            a.$watch('items["0"].post[0].content', function (next) {
                step2 = true
                _done()
            })
            a.items[0].comment.title = 'none'
            a.items[0].post[0].content = 'none'
        })
    })
    describe('$get', function () {
        it('$get property value correctly', function () {
            comment.$unwatch()
            comment.title = 'mux.js'
            comment.replyUsers = [1,2,3,4,5]
            assert.equal(comment.$get('title'), 'mux.js')
            assert.equal(comment.$get('replies'), 5)
        })
        it('$get property value by keyPath', function () {
            comment.$unwatch()

            comment.$add('person', {name: {first: 'switer'}})
            comment.replyUsers = [{name: {first: 'switer'}}]
            assert.equal(comment.$get('person.name.first'), 'switer')
            assert.equal(comment.$get('replyUsers[0].name.first'), 'switer')
        })
        it('$get computed property', function () {
            comment.$unwatch()
            comment.replyUsers = [{author: ''}]
            comment.$computed('first', ['replyUsers'], function () {
                return this.replyUsers[0].author
            })
            comment.replyUsers = [{author: 'switer'}]
            assert.equal(comment.first, 'switer')
            assert.equal(comment.$get('first'), 'switer')

            comment.replyUsers[0].author = 'switerX'
            assert.equal(comment.first, 'switer')
            assert.equal(comment.$get('first'), 'switerX')
            comment.replyUsers = comment.replyUsers
            assert.equal(comment.first, 'switerX')
        })
        it('define computed property not enumerable', function () {
            var a = new Mux({
                props: {
                    nums: [1,2,3]
                },
                computed: {
                    total: {
                        enum: false,
                        deps: ['nums'],
                        fn: function () {
                            return this.nums.length
                        }
                    }
                }
            })
            for (var k in a) {
                assert(k != 'total')
            }
        })
    })
    describe('$add', function () {
        it('observe a property', function (done) {
            comment.$unwatch()
            comment.$add('new')
            comment.$watch('new', function (next, pre) {
                assert.equal(next, 'new property')
                done()
            })
            comment.$set('new', 'new property')
            assert.equal(comment.new, 'new property')
        })
        it('observe a property with value', function (done) {
            comment.$unwatch()
            comment.$add('withvalue', 'value')
            assert.equal(comment.withvalue, 'value')
            comment.$watch('withvalue', function (next) {
                assert.equal(next, 'value2')
                done()
            })
            comment.$add('withvalue', 'value2')
        })
        it('observe multiple properties array', function (done) {
            comment.$unwatch()
            comment.$add(['prop1', 'prop2'])
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
        it('observe multiple properties object', function (done) {
            comment.$unwatch()
            comment.$add({
                prop3: 'prop3'
            })
            assert.equal(comment.prop3, 'prop3')
            comment.$watch('prop3', function (next) {
                assert.equal(next, 'prop4')
                done()
            })
            comment.$add({
                prop3: 'prop4'
            })
        })
    })
    describe('$computed', function () {
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

    describe('$props', function () {
        it('Get props of model correct without computed props', function () {
            var mux = new Mux({
                props: {
                    name: 'switer'
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
            var props = mux.$props()
            assert.equal(props.name, 'switer')
            assert.equal(props.nameLength, undefined)

        })
    })

    describe('$emitter', function () {
        it('Setting custom emitter using $emitter()', function (done) {
            var emitter = Mux.emitter()
            emitter.on('change:name', function (next) {
                assert.equal(next, 'switer')
                done()
            })
            var mux = new Mux({
                props: {
                    name: ''
                }
            })
            mux.$emitter(emitter),
            mux.name = 'switer'
        })
        it('Deep observe instance trigger change event corrent when reset emitter ', function (done) {
            var mux = new Mux({
                deep: true,
                props: {
                    name: {first: 'switer', last: 'guan'}
                }
            })
            var emitter = Mux.emitter()
            emitter.on('change:name.first', function (next) {
                assert.equal(next, 'kaishe')
                done()
            })
            mux.$emitter(emitter),
            mux.name.first = 'kaishe'
        })
    })
    describe('$destroy', function () {
        it('Instance do not work after destroyed', function () {
            var mux = new Mux({
                props: {
                    name: ''
                }
            })
            mux.$watch('name', function () {
                assert(false)
            })
            mux.$destroy()
            mux.name = 'switer'
        })
        it('destroy own scope handler when share emitter', function (done) {
            var emiter = Mux.emitter()

            var a = new Mux({
                emitter: emiter,
                props: {
                    name: ''
                }
            })
            var b = new Mux({
                emitter: emiter,
                props: {
                    name: ''
                }
            })
            b.$watch('name', function (next) {
                assert(false)
            })
            a.$watch('name', function (next) {
                assert.equal(next, 'switer')
                done()
            })
            b.$destroy()
            a.name = 'switer'
        })
    })

}
