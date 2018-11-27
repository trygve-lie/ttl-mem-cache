# ![ttl-mem-cache](logo.png)

A in memory time to live cache with streaming support.

[![Dependencies](https://img.shields.io/david/trygve-lie/ttl-mem-cache.svg?style=flat-square)](https://david-dm.org/trygve-lie/ttl-mem-cache)
[![Build Status](http://img.shields.io/travis/trygve-lie/ttl-mem-cache/master.svg?style=flat-square)](https://travis-ci.org/trygve-lie/ttl-mem-cache)
[![Greenkeeper badge](https://badges.greenkeeper.io/trygve-lie/ttl-mem-cache.svg?style=flat-square)](https://greenkeeper.io/)
[![Known Vulnerabilities](https://snyk.io/test/github/trygve-lie/ttl-mem-cache/badge.svg?targetFile=package.json&style=flat-square)](https://snyk.io/test/github/trygve-lie/ttl-mem-cache?targetFile=package.json)



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

 * ttl - `Number` - Default time to live in milliseconds all items in the cache should be cached before expiering.
 * stale - `Boolean` - If expired items in cache should be returned when pruned from the cache. Default: `false`.
 * changelog - `Boolean` - If emitted `set` event and stream should contain both old and new value. Default: `false`.
 * id - `String` - Give the instanse a unique identifier. Default: `hash`

If an option Object with a `ttl` is not provided all items in the cache will by default
cached for 5 minutes before they expire.

Items can be cached forever by setting `ttl` to `Infinity`. Items cached forever can
be overwritten and manually deleted.

Pruning of items from the cache happend when they are touched by one of the methods
for retrieving (`.get()` and `.entries()`) items from the cache. By default pruning
happens before the method returns a value so if an item have expired, `null` will be
returned for expired items. By setting `stale` to `true`, these methods will return
the pruned item(s) before they are removed from the cache.

Internally the cache has a unique ID created each time its instantiated. This ID is
used to tell the origin of an cached item when streaming. The `id` will override
this generated ID. When using this, be carefull to not provide the same ID to multiple
instances of the cache.

The Cache instance inherit from Duplex Stream. Due to this the instance also take all
config parameters which the Duplex Stream does. Please see the [documentation of Duplex Streams](https://nodejs.org/api/stream.html#stream_duplex_and_transform_streams)
for further documentation.


## API

The Cache instance have the following API:


### .set(key, value, ttl)

Set an item in the cache on a given key.

```js
const cache = new Cache();
cache.set('a', {foo: 'bar'});
cache.set('b', {foo: 'xyz'}, 20 * 60 * 1000);
```

This method take the following arguments:

 * key - An unique key the value should be stored on in the cache. Required.
 * value - The value to store on the key in the cache. Required.
 * ttl - Time to live before the item should expire. Uses default if not given. Optional.

An item can be cached forever by setting `ttl` to `Infinity`.


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
the time to live set on it, the item will be removed from the cache and this method
will return `null` unless `stale` is set to `true` on the constructor. Then the
expired item will be returned before its removed from the cache.


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
the time to live set on it, the item will be removed from the cache and it will not be
included in the returned value of this methid unless `stale` is set to `true` on the
constructor. Then the expired item will be included before its removed from the cache.

This method take the following arguments:

 * mutator - A function for mutating the items returned. Optional.

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


### .clear()

Clears the entire cache. All items will be deleted.


### .dump()

Returns an Array of all items in the cache ready to be used by `.load()`.


### .load(dump)

Loads an Array of items, provided by `.dump()`, into the cache.

This method take the following arguments:

 * dump - Array of items to be imported.

If any of the items in the loaded Array contains a key which already are in
the cache the entry in the cache will be overwritten.

If any of the entries in the loaded Array are not compatible with the format
which `.dump()` exports, they will not be inserted into the cache.

Returns and Array with the keys which was inserted into the cache.


### .length()

The number of items in the cache.


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
cache.on('set', (key, item) => {
    console.log(key, item);  // outputs: "a, {foo: 'bar'}"
});
cache.set('a', {foo: 'bar'});
```

If `changefeed` is set to be `true` on the constructor, the emitted Object will hold both
old and new value for the key. See "changelog" for further info.

### dispose

When an item is disposed (deleted) from the cache. Emits the `key` of the item and the item itself.

```js
const cache = new Cache();
cache.on('dispose', (key, item) => {
    console.log(key, item);  // outputs: "a, {foo: 'bar'}"
});
cache.set('a', {foo: 'bar'});
cache.del('a');
```

### clear

When the cache is cleared.



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


### Linking caches

With the stream API its possible to link caches together and distribute cached items between them.

```js
const Cache = require('../');

const cacheA = new Cache();
const cacheB = new Cache();
const cacheC = new Cache();

// Link all caches together
cacheA.pipe(cacheB).pipe(cacheC).pipe(cacheA);

// Set a value in cache C
cacheC.set('foo', 'bar');

// Retrieve the same value from all caches
console.log(cacheA.get('foo'), cacheB.get('foo'), cacheC.get('foo'));

// Delete the value in cache A
cacheA.del('foo');

// The value is deleted from all caches
console.log(cacheA.get('foo'), cacheB.get('foo'), cacheC.get('foo'));
```


### Streaming Object type

When using the Stream API to write to and read from the cache an [Entry Object](https://github.com/trygve-lie/ttl-mem-cache/blob/master/lib/entry.js)
or an Object of simmilar character is used.

The [Entry Object](https://github.com/trygve-lie/ttl-mem-cache/blob/master/lib/entry.js)
looks like this:

```js
{
    key: 'item key',
    value: 'item value',
    origin: 'cache instance ID',
    ttl: 'time to live',
    expires: 'time stamp'
}
```

The Stream API will always emit a full Entry Object. When writing to the Stream API one can provide
a full Entry Object, but a simmilar Object will also be accepted. Only `key` and `value` are required
properties when writing to the Stream API.

Iow; the following Object will be accepted by the Stream API:

```js
{
    key: 'foo',
    value: 'bar'
}
```

`key` defines what key the value of `value` should be stored on in the cache. `key` is required
and if not provided the stream will emit an error.

When writing to the cache and a Object with `value` with a value is provided, it will be stored in
the cache on the provided `key`. If `value` is not provided or `null` or `undefined` on the
Object when writing to the cache, any item with a matching `key` in the cache will be deleted.

When the stream emits objects each object will have a `origin` key. The value is the unique ID of
the instance the object first was emitted on the stream. If the construcor was given a value for
the `id` argument, this will be used as `origin` value.

`ttl` is how long the item is set to live in the cache.

`expires` is the calculated timestamp for when the item should expire from the cache. This is
calculated when an item is set in the cache. If a value for `expires` is provided when writing
to the Stream API this value will be set in the cache.

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

The [Entry Object](https://github.com/trygve-lie/ttl-mem-cache/blob/master/lib/entry.js) does
implement `.toPrimitive` where a stringified JSON representation of the Object will be returned
when call to the Entry Object with a String hint is done.

This can be used when one want to convert the Entry Object into a [Buffer](https://nodejs.org/api/buffer.html).

```js
const cache = new Cache();
const dest = new SomeWritableStream();  // Some destination supporting Buffers

const convert = new stream.Transform({
    writableObjectMode: true,
    readableObjectMode: false,
    transform(obj, encoding, callback) {
        const buff = Buffer.from(obj);  // Convert Entry Object to a Buffer
        this.push(buff);
        callback();
    }
});

cache.pipe(convert).pipe(dest);
```

### Object Mode

By default the stream are in object mode. Its also supported to run the stream in non-object
mode. Object mode can be turned off by setting `objectMode` to `false` as an option to the
constructor.

When using non-object mode the stream will emit `Buffers` containing a stringified JSON
representaion of the Entry Object.



## Changelog

If the attribute `changelog` is set to `true` on the constructor, the `set` events will emit an
object holding both old and new values for the key.

The emitted object looks like this:

```js
{
    oldVal: 'foo',
    newVal: 'bar'
}
```

Example:

```js
const Cache = require('ttl-mem-cache');

const cache = new Cache({ changefeed: true });
cache.on('set', (key, item) => {
    // item will be in the format above
});
cache.set('a', 'foo');
cache.set('a', 'bar');
```

If a key does not hold a value in cache before, `oldVal` will be `null`.
If a key hold a value which has expired and `stale` is `false`, `oldVal` will be `null`.
If a key hold a value which has expired and `stale` is `true`, `oldVal` will be the old value.



## node.js compabillity

This module is written in ES6 and uses some functions only found in node.js 8.2
and newer. This module will not function with older than 8.2 versions of node.js.



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
