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

    describe('Global API', function () {
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
                    get: function () {
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
        it('Instance of Mux', function () {
            assert(person instanceof Mux)
            var Clazz = Mux.extend()
            var ins = new Clazz()
            assert(person instanceof Mux)
            assert(ins instanceof Mux)
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

        it('Has instance methods', function (done) {
            person.$unwatch()
            person.$add('email', 'guankaishe@gmail.com')
            person.$watch('email', function (next) {
                assert.equal(next, 'none')
                done()
            })
            person.$set('email', 'none')
        })
    })
}