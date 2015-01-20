![logo](http://switer.qiniudn.com/mux-verti.png?imageView/2/w/120) Muxjs
===========
[![build](https://travis-ci.org/switer/muxjs.svg?branch=master)](https://travis-ci.org/switer/muxjs)
[![Coverage Status](https://coveralls.io/repos/switer/muxjs/badge.svg?branch=develop)](https://coveralls.io/r/switer/muxjs)

Using Muxjs is easy to track the app state. What's app state and how to describe state tansition. When your look back code and find some logic are described as below:
> if this condition and this other condition are met, then this value should be 'x'.

So,  *vars* of conditions are state, and *condition* is transition, and *'x'* is transpositional state. Using **Muxjs**, you can track  *vars* changing and transition's result *'x'*  changing by
subscribing their **change event**.


## browser support
![browser support](https://ci.testling.com/switer/muxjs.png)

## Installation
**browser**
```html
<script src="dist/mux.js"></script>
```
**node.js**
```bash
npm install muxjs --save
```

## API Reference

### Mux Constructor and Class
#### *`Mux(props)`*
It is a constructor function that allows you to create Mux instances.
*`props`* are those observed properties with default value.
```js
var author = new Mux({
    name: 'switer'
})
```

#### *`Mux.extend(options)`*
Create a "subclass" of the base Mux constructor.
```js
var Person = Mux.extend({
    props: function () {
        profession: 'programer',
        name: ''
    }
})
var author = new Person({
    name: 'switer'
})
assert.equal(author.profession, 'programer')
assert.equal(author.name, 'switer')
```

### Instance Options
#### *`props`*

- Type: ` Function`

Return the initial observed property object for this mux instance:
```js
var person = new Mux({
    name: 'mux'
})
assert.equal(person.name, 'mux')
```

### Instance Methods


## Example
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