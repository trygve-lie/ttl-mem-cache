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

 * maxAge - `Number` - Default max age in milliseconds all items in the cache should be cached before expiering
 * stale - `Boolean` - If expired items in cache should be returned when pruned from the cache. Default: `false`.

If an option Object with a `maxAge` is not provided all items in the cache will by
default cached for 5 minutes before they expire.

Pruning of items from the cache happend when they are touched by one of the methods
for retrieving items from the cache. By default pruning happens before the method
returns a value so if an item have expired, `undefined` will be returned for expired
items. By setting `stale` to `true`, these methods will return the pruned item(s)
before they are removed from the cache.



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
will return `undefined` unless `stale` is set to `true` on the constructor. Then
the expired item will be returned before its removed from the cache.


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

Triggering `.entries()` will check the expire on the items. If an item is older than
the max age set on it, the item will be removed from the cache and it will not be
included in the returned value of this methid unless `stale` is set to `true` on the
constructor. Then the expired item will be included before its removed from the cache.

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


### .prune()

Iterates over all items in the cache and proactively prunes expired items.



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



## Streams

The Cache instance is a [Duplex Stream](https://nodejs.org/api/stream.html#stream_duplex_and_transform_streams). One can stream
items in and out of the cache.

Example of streaming into the cache:

```js
const cache = new Cache();
const source = new SomeReadableStream();  // a source streaming an item on key 'a' into the cache

source.pipe(cache);

cache.get('a');  // returns the item for key 'a'
```

Example of streaming out of the cache:

```js
const cache = new Cache();
const dest = new SomeWritableStream();  // a destination stream recieving items from the cache

cache.pipe(dest);

cache.set('a', {foo: 'bar'});  // pushes {foo: 'bar'} onto the writable stream
```

Example of streaming through the cache (all items streamed through will be kept in the cache):

```js
const cache = new Cache();
const source = new SomeReadableStream();  // a source streaming items into the cache
const dest = new SomeWritableStream();  // a destination stream recieving items from the cache

source.pipe(cache).pipe(dest);

cache.entries();  // returns all the items streamed through the cache
```

### Streaming Object type

When writing to the cache, one can control what goes into the cache etc by a dedicated Object type. When reading from the cache, the stream will output the same Object type.

The Object type looks like this:

```js
{
    key: 'item key',
    value: 'item value'
}
```

`key` defines what key the value of `value` should be stored on in the cache. `key` is required
and if not provided the stream will emit an error.

When writing to the cache and a Object with `value` with a value is provided, it will be stored in
the cache on the provided `key`. If `value` is not provided or `null` or `undefined` on the
Object when writing to the cache, any item with a matching `key` in the cache will be deleted.

If the items you want to store in the cache does not fit your data type, its recommended to use
a [Transform Stream](https://nodejs.org/api/stream.html#stream_implementing_a_transform_stream)
to transform it into the supported Object type.

Example:

```js
const cache = new Cache();
const source = new SomeReadableStream();  // contains Objects like this {id: 'a', item: 'bar'}

const convert = new stream.Transform({
    objectMode: true,
    transform(obj, encoding, callback) {
        this.push({
            key: obj.id,
            value: obj.item
        });
        callback();
    }
});

source.pipe(convert).pipe(cache);
```



## node.js compabillity

This module use some native ES6 functions only found in node.js 6.x and newer.
This module will not function with older than 6.x versions of node.js.



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
