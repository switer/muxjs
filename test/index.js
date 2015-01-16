var Mux = require('../index')


var Comment = Mux.extend({
    /**
     *  Get initial props
     */
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

comment.$watch('title', function (next, pre) {
    console.log('[title]', next, '[prevalue]', pre)
})
comment.$watch(function () {
    console.log('[*]')
})

comment.$set('title', 'hello world')
console.log(comment.title)
comment.$set({
    title: 'rename',
    author: 'switer'
})
comment.$set('untitle', 123)
comment.$set('replyUsers', [1,2,3])
console.log(comment.replies)