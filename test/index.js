var Mux = require('../index')


var Comment = Mux.extend({
    /**
     *  Get initial props
     */
    props: function () {
        return {
            title: 'comment to me',
            author: 'switer'
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
comment.$set({
    title: 'rename',
    author: 'switer'
})