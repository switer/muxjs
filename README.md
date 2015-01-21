![logo](http://switer.qiniudn.com/mux-verti.png?imageView/2/w/110) Muxjs
===========
[![build](https://travis-ci.org/switer/muxjs.svg?branch=master)](https://travis-ci.org/switer/muxjs)
[![Coverage Status](https://coveralls.io/repos/switer/muxjs/badge.svg?branch=master)](https://coveralls.io/r/switer/muxjs?branch=master)

Using Muxjs is easy to track the app state. What's app state and how to describe state tansition. When your look back code and find some logic are described as below:
> if this condition and this other condition are met, then this value should be 'x'.

So,  *vars* of conditions are state, and *condition* is transition, and *'x'* is transpositional state. Using **Muxjs**, you can track  *vars* changing and transition's result *'x'*  changing by
subscribing their **change event**.

Let's look at the example case diagram of a stateful application. 

![Case Diagram](http://switer.qiniudn.com/muxjs.png)

`Left` of diagram is a app's **view-controller** with 5 state (circle), and 3 state **transition logic** (rhombus).<br />
`Right` of disgram is an **UI Page** with 4 parts, each part depend on state or state-transition.
If state is trackable, then binding specified DOM opertions to state changing, 
finally it implement the **data to DOM binding**. It's usefull, all right?

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
- **[Gloabal API](#global-api)**
    - [Mux(props)](#muxprops)
    - [Mux.extend(options)](#muxextendoptions)
- **[Instance Options](#instance-options)**
    - [props](#props)
    - [computed](#computed)
- **[Instance Methods](#instance-methods)**
    - [$set(\[keyPath, value\] | props)](#setkeypath-value--props-)
    - [$get(propname)](#computed)
    - [$add(\[propname \[, defaultValue\]\] | propnameArray | propsObj)](#addpropname--defaultvalue--propnamearray--propsobj-)
    - [$computed(\[propname, deps, fn\] | computedPropsObj)](#computedpropname-deps-fn--computedpropsobj)
    - [$watch(\[name, \] callback)](#watchname--callback)
    - [$unwatch(\[\[name, \] callback\])](#unwatchname--callback)

### Global API
##### `Mux(options)`
It is a constructor function that allows you to create Mux instance.*`options`* see: [Instance Options](#instance-options).

```js
var author = new Mux({
    props: function () {
        return 'firstName lastName' 
    },
    computed: {
        firstName: {
            deps: ['name'],
            fn: function () {
                return this.name.split(' ')[0]
            }
        }
    }
})
assert.equal(author.firstName, 'firstName')
```

##### `Mux.extend(options)`
- Return: `Function` Class

Create a *subclass* of the base Mux constructor. *`options`* see: [Instance Options](#instance-options).

*Class* can instance with param `propsObj` which will set values to those observered properties of the instance. 

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
##### `props`
- Type: ` Function` | `Object`

Return the initial observed property object for this mux instance.Recommend to using function which return 
a object if you don't want to share **props** option's object in each instance:

```js
var Person = Mux.extend({
    props: function () {
        return {
            name: 'mux'
        }
    }
})
assert.equal((new person).name, 'mux')
```
Or **props** option could be an object:

```js
var Person = new Mux({
    props: {
        name: 'mux'
    }
})
assert.equal((new person).name, 'mux')
```

##### `computed`
- Type: ` Object`

### Instance Methods
##### `$set([keyPath, value] | props)`
- **keyPath** `String` property path , such as:  *"items[0].name"*
- **value** *[optional]*
- *or*
- **props** `Object` *[optional]* data structure as below:  
    
    ```js
    { "propertyName | keyPath": propertyValue }
    ```

Set value to property by property's keyPath or propertyName, which could trigger change event when value change or value is an object reference (instanceof  Object). 
**Notice:** PropertyName shouldn't a keyPath (name string without contains *"[", "]", "."* )

```js
var list = new Mux({
    items: [{name: '1'}]
})
list.$set('items[0].name', '')
```

##### `$get(propname)`
- **propname** `String` only propertyname not keyPath (without contains "[", "]", ".")

Get property value. It's equal to using "." or "[]" to access value except computed properties.

```js
var post = new Mux({
    props: {
        data: {
            title: 'Mux',
            replyUsers: [{
                author: ''
            }]
        }
    },
    computed: {
        firstReplyUser: {
            deps: ['data'],
            fn: function () {
                return this.replyUsers[0].author
            }
        }
    } 
})
assert.equal(post.data.title, 'Mux doc')
assert.equal(post.$get('post.data.title', 'Mux doc'))
```

Using "." or "[]" to access computed property's value will get a cached result, so you can use "$get()"
to recompute the property's value whithout cache.

```js
post.$set('data.replyUses[0].author', 'switer')
assert.equal(post.$get('data.replyUses[0].author', 'switer'))

var users = [{
    author: 'switer'
}]
post.$set('data.replyUses', users)
assert.equal(post.firstReplyUser, 'switer'))
// modify selft
user[0].author = 'guankaishe'
assert.equal(post.firstReplyUser, 'switer'))
assert.equal(post.$get('firstReplyUser'), 'guankaishe'))
```

##### `$add([propname [, defaultValue]] | propnameArray | propsObj)`
- **propname** `String` 
- **defaultValue** *[optional]*
- *or*
- **propnameArray** `Array` 
- *or* 
- **propsObj** `Object` 



##### `$computed([propname, deps, fn] | computedPropsObj)`

##### `$watch([name, ] callback)`

##### `$unwatch([[name, ] callback])`

## Example
```js
var Comment = Mux.extend({
    props: function () {
        return {
            title: 'states model',
            author: 'switer',
            content: 'Tracking app state using Muxjs.',
            replyUsers: [{
                author: 'guankaishe',
                id: 'xx-xxx-xxx',
                content: 'switer/muxjs'
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
    id: 'xx-xxx-xxx',
    content: 'Cool'
})
```