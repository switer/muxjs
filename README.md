mux
===========
Mobile webapp data model build with flux.

![logo](http://switer.qiniudn.com/mux-verti.png?imageView/2/w/120)

![build](https://travis-ci.org/switer/muxjs.svg?branch=master)

## browser support
![browser support](https://ci.testling.com/switer/muxjs.png)

## Installation
**browser**
```html
<script src="mux.js"></script>
```
**node.js**
```bash
npm install muxjs --save
```
## Usage
```js
var Comment = Mux.extend({
    props: function () {
        return {
            title: 'states model',
            author: 'switer',
            content: 'Mobile webapp data model build with flux.',
            replyUsers: [{
                author: 'guankaishe',
                id: 'xxxxxxxx',
                content: 'awesome !'
            }]
        }
    },
    computed: {
        replies: {
            deps: ['replyUsers'],
            fn: function () {
                return this.replyUser.length
            }
        }
    }
})

var comment = new Comment()
comment.$watch('replies', function (next, pre) {
    assert.equal(this.replies, 2)
})
comment.replyUsers.push({
    author: 'guankaishe',
    id: 'xxxxxxxx',
    content: 'Cool'
})
```

## API

## Example