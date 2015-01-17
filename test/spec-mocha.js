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

    describe('props', function (t) {
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

    })
}
