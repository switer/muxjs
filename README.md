![logo](http://switer.qiniudn.com/mux-verti.png?imageView/2/w/110) Muxjs
===========
[![build](https://travis-ci.org/switer/muxjs.svg?branch=master)](https://travis-ci.org/switer/muxjs)
[![Coverage Status](https://coveralls.io/repos/switer/muxjs/badge.svg?branch=master)](https://coveralls.io/r/switer/muxjs?branch=master)
[![npm version](https://badge.fury.io/js/muxjs.svg)](http://badge.fury.io/js/muxjs)

Using Muxjs is easy to track the app state. What's state and it's tansition? When look back your codes, often find some logic are described as below:
> if this condition and this other condition are met, then this value should be 'x'.

Here,  *vars* of condition are state, and *condition* is transition, so *'x'* is the transposition's result. 
**Muxjs** give the way to subscribe *vars*'s changs and transition's result *'x'*'s changes.

Let's look at the diagram of an example case of an stateful application: 

![Case Diagram](http://switer.qiniudn.com/muxjs.png)

`Left` of diagram is a **view-controller** with 5 state (circle) and 3 **transition** (rhombus).<br />
`Right` of disgram is an **UI Page** with 4 parts, each part depend on one state or transition.
If we can subscribe all changes of state and transition, so we can bind specified DOM opertion when state/transition change,
finally it implement the **data to DOM binding** , event can do more stuff for a completed **MVVM** framework such as [Zect](https://github.com/switer/Zect). 
It's usefull, all right?

## Installation
**browser:** 
- [mux.js](https://raw.githubusercontent.com/switer/muxjs/master/dist/mux.js)
- [mux.min.js](https://raw.githubusercontent.com/switer/muxjs/master/dist/mux.min.js) (4.1k when gzipped)

```html
<script src="dist/mux.js"></script>
```
**node.js:**
```bash
npm install muxjs --save
```
## Examples:
- [Zect](https://github.com/switer/Zect) Vue.js, way.js like
- [virtual-dom-binding](https://github.com/switer/virtual-dom-binding) render view with virtual-dom
- [data-dom-binding](https://github.com/switer/data-dom-binding) zepto do DOM maniputation

## API Reference
- **[Gloabal API](#global-api)**
    - [Mux(\[props\])](#muxoptions)
    - [Mux.extend(\[options\])](#muxextendoptions)
    - [Mux.config(\[conf\])](#muxconfigconf)
    - [Mux.emitter(\[context\])](#muxemittercontext)
- **[Instance Options](#instance-options)**
    - [props](#props)
    - [computed](#computed)
    - [deep](#deep)
    - [emitter](#emitter)
- **[Instance Methods](#instance-methods)**
    - [$set(\[keyPath, value\] | props)](#setkeypath-value--props)
    - [$get(propname)](#computed)
    - [$add(\[propname \[, defaultValue\]\] | propnameArray | propsObj)](#addpropname--defaultvalue--propnamearray--propsobj)
    - [$computed(\[propname, deps, fn, enum\] | computedPropsObj)](#computedpropname-deps-fn-enum--computedpropsobj)
    - [$watch(\[propname, \] callback)](#watchpropname--callback)
    - [$unwatch(\[propname, \] \[callback\])](#unwatchpropname--callback)
    - [$props( )](#props-)
    - [$destroy()](#destroy)
    - [$destroyed()](#destroyed)

## Wiki
- [Deep observe](https://github.com/switer/muxjs/wiki/Deep-observe)
- [The imperfection of "Object.defineProperty"](https://github.com/switer/muxjs/wiki/The-imperfection-of-%22Object.defineProperty%22)
- [Compare defineproperties to looped defineproperty](https://github.com/switer/muxjs/wiki/Compare-defineproperties-to-looped-defineproperty)
- [Can't observe array's indices](https://github.com/switer/muxjs/wiki/The-performance-problem-of-defineProperty-to-array-index)

### Global API
##### `Mux(options)`

[ :bookmark:  API Reference Navigation](#api-reference)

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

##### `Mux.extend([options])`
- Return: `Function` Class

[ :bookmark:  API Reference Navigation](#api-reference)

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

##### `Mux.config([conf])`

[ :bookmark:  API Reference Navigation](#api-reference)

Global configure. Currently supported configurations:
    * warn `Boolean` if value is `false`, don't show any warning log. **Default**  is `true`

```js
Mux.config({
    warn: false // no warning log
})
```

##### `Mux.emitter([context])`
- Params: 
    * context `Object` binding "this" to `context` for event callbacks.

[ :bookmark:  API Reference Navigation](#api-reference)

Create a emitter instance.

```js
var emitter = Mux.emitter()
emitter.on('change:name', function (name) {
    // do something
}) // subscribe
emitter.off('change:name') // unsubscribe
emitter.emitter('change:name', 'switer') // publish message
```

### Instance Options
##### `props`
- Type: ` Function` | `Object`

[ :bookmark:  API Reference Navigation](#api-reference)

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
**props** option could be an object:

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
- Options:
    - **deps** `Array` property dependencies.
         *Restricton:*  *`deps`*'s item could be keyPath (contain `.` and `[]`, such as: "post.comments[0]").
    - **fn** `Function` Compute function , using as a getter
    - **enum** `Boolean` Whether the computed property enumerable or not

[ :bookmark:  API Reference Navigation](#api-reference)

Computed properties definition option. `"fn"` will be called if one of dependencies has change, then will emit a change event if `"fn"` returns result has change.  

```js
var mux = new Mux({
    props: {
        items: [1,2,3]
    },
    computed: {
        count: {
            deps: ['items'],
            fn: function () {
                return this.items.length
            }
        }
    }
})
assert.equal(mux.cout, 3)
```
Watch computed property changes:

```js
mux.$watch('count', function (next, pre) {
    assert.equal(next, 3)
    assert.equal(next, 4)
})
mux.items.push(4)
assert.equal(mux.count, 4)
```

##### `deep`
- Type: ` Boolean`

[ :bookmark:  API Reference Navigation](#api-reference)

Deep observe for `prop`/`subprop` type of `Object`|`Array`.Default is `true`. See: [Deep observe](https://github.com/switer/muxjs/wiki/Deep-observe)
```js
new Mux({
    deep: false, // disable deep observe
    props: {}
})
```

##### `emitter`
- Type: ` EventEmitter`

[ :bookmark:  API Reference Navigation](#api-reference)

Use custom emitter instance.
```js
var emitter = Mux.emitter()
emitter.on('change:name', function (next) {
    next // --> switer
})
var mux = new Mux({
    emitter: emitter,
    props: {
        name: ''
    }
})
mux.name = 'switer'
```

### Instance Methods
##### `$set([keyPath, value] | props)`
* Params:
    - **keyPath** `String` property path , such as:  *"items[0].name"*
    - **value** *[optional]*
    - *or*
    - **props** `Object` *[optional]* data structure as below:
    ```js
    { "propertyName | keyPath": propertyValue }
    ```
* Return: **this**

[ :bookmark:  API Reference Navigation](#api-reference)

Set value to property by property's keyPath or propertyName, which could trigger change event when value change or value is an object reference (instanceof  Object). 
**Notice:** PropertyName shouldn't a keyPath (name string without contains *"[", "]", "."* )

```js
var list = new Mux({
    items: [{name: '1'}]
})
list.$set('items[0].name', '')
```

##### `$get(propname)`
* Params:
    - **propname** `String` only propertyname not keyPath (without contains "[", "]", ".")
* Return: *value*

[ :bookmark:  API Reference Navigation](#api-reference)

Get property value. It's equal to using "." or "[]" to access value except computed properties.

```js
var mux = new Mux({
    props: {
        replyUsers: [{
            author: 'switer'
        }]
    }
})
assert.equal(mux.$get('replyUses[0].author', 'switer'))
```

**Notice:** Using "." or "[]" to access computed property's value will get a cached result, 
so you can use "$get()" to recompute the property's value whithout cache.

```js
// define a computed property which use to get the first user of replyUsers
mux.$computed(firstReplyUser, ['replyUsers'], function () {
    return this.replyUsers[0].author
})

var users = [{
    author: 'switer'
}]

mux.$set('replyUsers', users)

user[0].author = 'guankaishe' // modify selft

assert.equal(post.firstReplyUser, 'switer'))
assert.equal(post.$get('firstReplyUser'), 'guankaishe'))
```

##### `$add([propname [, defaultValue]] | propnameArray | propsObj)`
* Params:
    - **propname** `String` 
    - **defaultValue** *[optional]*
    - *or*
    - **propnameArray** `Array` 
    - *or* 
    - **propsObj** `Object` 
* Return: **this**

[ :bookmark:  API Reference Navigation](#api-reference)

Define an observerable property or multiple properties.
```js
mux.$add('name', 'switer')
// or
mux.$add(['name']) // without default value
// or
mux.$add({ 'name': 'switer' })
```

##### `$computed([propname, deps, fn, enum] | computedPropsObj)`
* Params:
    - **propname** `String` property name
    - **deps** `Array` Property's dependencies
    - **fn** `Function` Getter function
    - **enum** `Boolean` whether the computed property enumerable or not 
    - *or*
    - **computedPropsObj** `Object` 
* Return: **this**

[ :bookmark:  API Reference Navigation](#api-reference)

Define a computed property. *deps* and *fn* is necessary. If one of **deps** is observable of the instance, emitter a change event after define.
*computedPropsObj* is using to define multiple computed properties in once,
each key of *computedPropsObj* is property's name and value is a object contains "deps", "fn".
Usage as below: 

```js
// before define computed
assert.equal(mux.commentCount, undefined)
mux.$computed('commentCount', ['comments'], function () {
    return this.comments.length
})
// after define computed
assert.equal(mux.commentCount, 1)
```

##### `$watch([propname, ] callback)`
* Params:
    - **propname** `String` *[optional]*
    - **callback** `Function`
* Return: `Function` unwatch handler

[ :bookmark:  API Reference Navigation](#api-reference)

Subscribe property or computed property changes of the Mux instance.


```js
var unwatch = mux.$watch('title', function (nextValue, preValue) {
    // callback when title has change
})
unwatch() // cancel subscribe
```
if *propname* is not present, will watch all property or computed property changes:

```js
mux.$watch(function (propname, nextValue, preValue) {
    // callback when title has change
})
```


##### `$unwatch([propname, ] [callback])`
* Params: 
    - **propname** `String` *[optional]*
    - **callback** `Function` *[optional]*
* Return: **this**

[ :bookmark:  API Reference Navigation](#api-reference)

Unsubscribe property or computed property changes of the Mux instance.
```js
// subscribe
mux.$watch('name', handler)
// unsubscribe
mux.$unwatch('name', handler)
// unsubscribe all of specified propertyname
mux.$unwatch('name')
// unsubscribe all of the Mux instance
mux.$unwatch()
```

##### `$props( )`
* Return: `Object`

[ :bookmark:  API Reference Navigation](#api-reference)

Return all properties of the instance. Properties do not contain computed properties(Only observed properties).
```js
var mux = Mux({ props: { name: 'Muxjs' } })
mux.$props() // --> {name: 'Muxjs'}
```

##### `$emitter(emitter)`
* Return: **this**

[ :bookmark:  API Reference Navigation](#api-reference)

Reset emitter of the mux instance
```js
var mux = Mux()
var em = Mux.emitter()
mux.$emitter(em)
```

##### `$destroy()`

[ :bookmark:  API Reference Navigation](#api-reference)

Destroy the instance, remove all listener of the internal emiter of the instance, free all props references.


##### `$destroyed()`
* Return: **Boolean**

[ :bookmark:  API Reference Navigation](#api-reference)

Whether the instance is destroyed or not.

## License

MIT