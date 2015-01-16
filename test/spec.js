
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

test('props', function (t) {
    t.plan(3)
    t.equal(comment.title, 'comment to me')
    comment.title = 'abc'
    t.equal(comment.title, 'abc')
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
    t.test('Watch all properties', function (st) {
        st.plan(1)
        comment.$unwatch()
        comment.$watch(function () {
            console.log('---------change')
            st.equal(this.replies, 2)
        })
        comment.$set('replyUsers', [1,2])
    })
})

