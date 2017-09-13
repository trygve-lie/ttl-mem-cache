# ttl-mem-cache

[![Dependencies](https://img.shields.io/david/trygve-lie/ttl-mem-cache.svg?style=flat-square)](https://david-dm.org/trygve-lie/ttl-mem-cache)[![Build Status](http://img.shields.io/travis/trygve-lie/ttl-mem-cache/master.svg?style=flat-square)](https://travis-ci.org/trygve-lie/ttl-mem-cache)

A in memory time to live cache with streaming support.



## Installation

```bash
$ npm install ttl-mem-cache
```



## Example

Set an object and retrieve it.

```js
const Cache = require('ttl-mem-cache');

const cache = new Cache();

cache.set('a', {foo: 'bar'});
const obj = cache.get('a'); // returns {foo: 'bar'}
```



## Description

This is a in memory time to live key/value cache with streaming support. Items are
not pro-actively pruned out as they age but expires when they are too old when touched.
In other words; this module does not use `setTimeout()` or simmilar methods internally.

There is no restrictions on the values stored in the cache and there is no maximum limit
of the amount of items in the cache. Whan that is said, the intention of this module is
to act as a simple key/value cache where one need to cache small to medium amounts of
data.



## Constructor

Create a new Cache instance.

```js
const Cache = require('ttl-mem-cache');
const cache = new Cache(options);
```

### options (optional)

An Object containing misc configuration. The following values can be provided:

 * maxAge - Default max age in milliseconds all items in the cache should be cached before expiering

If an option Object with a `maxAge` is not provided all items in the cache will by
default cached for 5 minutes before they expire.



## API

The Cache instance have the following API:


### .set(key, value, maxAge)

Set an item in the cache on a given key.

```js
const cache = new Cache();
cache.set('a', {foo: 'bar'});
cache.set('b', {foo: 'xyz'}, 20 * 60 * 1000);
```

This method take the following arguments:

 * key - An unique key the value should be stored on in the cache. Required.
 * value - The value to store on the key in the cache. Required.
 * maxAge - Max age before this item should expire. Uses default if not given. Optional.


### .get(key)

Get an item on a given key from the cache.

```js
const cache = new Cache();
cache.set('a', {foo: 'bar'});
const obj = cache.get('a'); // returns {foo: 'bar'}
```

This method take the following arguments:

 * key - The unique key for the item in the cache. Required.

Triggering `.get()` will check the expire on the item. If the item is older than
the max age set on it, the item will be removed from the cache and this method
will return `undefined`.


### .del(key)

Explicitly delete an item on a given key in the cache.

```js
const cache = new Cache();
cache.set('a', {foo: 'bar'});
cache.del('a');
```

This method take the following arguments:

 * key - The unique key for the item in the cache. Required.


### .entries(mutator)

Get all items in the cache. Returns an Array with all items.

```js
const cache = new Cache();
cache.set('a', {foo: 'bar'});
cache.set('b', {foo: 'xyz'});
const all = cache.entries(); // returns [{foo: 'bar'}, {foo: 'xyz'}]
```

This method take the following arguments:

 * mutator - A function for mutating the items returned. Optional.

Triggering `.entries()` will check the expire on all the items. If an item is older
than the max age set on it, the item will be removed from the cache and it will not
be part of the returned Array.

The mutator attribute can be used to change the structure of the returned items. It
takes a function which will be called with an Object with the `key` and `value`. This
function must return a value which then will be the value of the item in the returned
output.

```js
const cache = new Cache();
cache.set('a', {foo: 'bar'});
cache.set('b', {foo: 'xyz'});
const all = cache.entries((item) => {
    return item.value.foo;
}); // returns ['bar', 'xyz']
```

The advantage of using the mutator if one want to mutate the items is that the mutator
is applied to each item in the same process as the expire is checked.



## Events

The Cache instance inherit from Duplex Stream. Due to this the instance emits all the
events which Duplex Stream does when the streaming feature is used. Please see the
[documentation of Duplex Streams](https://nodejs.org/api/stream.html#stream_duplex_and_transform_streams)
for further documentation.

In addition to this, the following events are emitted:


### set

When an item is set in the cache. Emits an Object with the `key` and `value` of the item.

```js
const cache = new Cache();
cache.on('set', (item) => {
    console.log(item);  // outputs: {key: 'a', value: {foo: 'bar'}}
});
cache.set('a', {foo: 'bar'});
```

### dispose

When an item is disposed (deleted) from the cache. Emits the `key` of the item.

```js
const cache = new Cache();
cache.on('dispose', (key) => {
    console.log(key);  // outputs: 'a'
});
cache.set('a', {foo: 'bar'});
cache.del('a');
```



## node.js compabillity

This module use some native ES6 functions only found in node.js 4.8.x and newer.
This module will not function with older than 4.8.x versions of node.js.



## error handling

This module does not handle errors for you, so you must handle errors on
whatever streams you pipe into this module. This is a general rule when
programming with node.js streams: always handle errors on each and every stream.

We recommend using [`end-of-stream`](https://npmjs.org/end-of-stream) or [`pump`](https://npmjs.org/pump)
for writing error tolerant stream code.



## License

The MIT License (MIT)

Copyright (c) 2017 - Trygve Lie - post@trygve-lie.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
