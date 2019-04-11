'use strict';

const stream = require('stream');
const lolex = require('lolex');
const tap = require('tap');
const Cache = require('../');

const srcObjectStream = (arr) => {
    return new stream.Readable({
        objectMode: true,
        read() {
            arr.forEach((item) => {
                this.push(item);
            });
            this.push(null);
        }
    });
};

const srcBufferStream = (arr) => {
    return new stream.Readable({
        objectMode: false,
        read() {
            arr.forEach((item) => {
                this.push(item);
            });
            this.push(null);
        }
    });
};

const destObjectStream = (done) => {
    const arr = [];

    const dStream = new stream.Writable({
        objectMode: true,
        write(chunk, encoding, callback) {
            arr.push(chunk);
            callback();
        }
    });

    dStream.on('finish', () => {
        done(arr);
    });

    return dStream;
};

const destBufferStream = (done) => {
    const arr = [];

    const dStream = new stream.Writable({
        objectMode: false,
        write(chunk, encoding, callback) {
            arr.push(chunk);
            callback();
        }
    });

    dStream.on('finish', () => {
        done(arr);
    });

    return dStream;
};



/**
 * Constructor
 */

tap.test('cache() - object type - should be TtlMemCache', (t) => {
    const cache = new Cache();
    t.equal(Object.prototype.toString.call(cache), '[object TtlMemCache]');
    t.end();
});

tap.test('cache() - without ttl - should set default ttl', (t) => {
    const cache = new Cache();
    t.equal(cache.ttl, (5 * 60 * 1000));
    t.end();
});

tap.test('cache() - with ttl - should set default ttl', (t) => {
    const ttl = (60 * 60 * 1000);
    const cache = new Cache({ ttl });
    t.equal(cache.ttl, ttl);
    t.end();
});

tap.test('cache() - without id - should set default id', (t) => {
    const cache = new Cache();
    t.ok(cache.id);
    t.end();
});

tap.test('cache() - with id - should set default id', (t) => {
    const id = 'foo';
    const cache = new Cache({ id });
    t.equal(cache.id, id);
    t.end();
});



/**
 * .set()
 */

tap.test('cache.set() - without key - should throw', (t) => {
    const cache = new Cache();
    t.throws(() => {
        cache.set();
    }, new Error('Argument "key" cannot be null or undefined'));
    t.end();
});

tap.test('cache.set() - without value - should throw', (t) => {
    const cache = new Cache();
    t.throws(() => {
        cache.set('foo');
    }, new Error('Argument "value" cannot be null or undefined'));
    t.end();
});

tap.test('cache.set() - with key and value - should return the set value', (t) => {
    const cache = new Cache();
    const result = cache.set('foo', 'bar');
    t.equal(result, 'bar');
    t.end();
});

tap.test('cache.set() - with key and value - should set value on key in storage', (t) => {
    const cache = new Cache();
    cache.set('foo', 'bar');
    t.equal(cache.store.get('foo').value, 'bar');
    t.end();
});

tap.test('cache.set() - without ttl - should set default ttl', (t) => {
    const clock = lolex.install();
    clock.tick(100000);

    const cache = new Cache();
    cache.set('foo', 'bar');
    t.equal(cache.store.get('foo').expires, 400000); // default ttl + lolex tick time

    clock.uninstall();
    t.end();
});

tap.test('cache.set() - with ttl - should set ttl', (t) => {
    const clock = lolex.install();
    clock.tick(100000);

    const cache = new Cache();
    cache.set('foo', 'bar', (60 * 60 * 1000));
    t.equal(cache.store.get('foo').expires, 3700000);

    clock.uninstall();
    t.end();
});

tap.test('cache.set() - call twice with different values - should cache value of the last set', (t) => {
    const cache = new Cache();
    cache.set('foo', 'bar');
    cache.set('foo', 'xyz');
    t.equal(cache.store.get('foo').value, 'xyz');
    t.end();
});

tap.test('cache.set() - listen on "set" event - "on.set" event should emit key and value', (t) => {
    const cache = new Cache();
    cache.on('set', (key, value) => {
        t.equal(key, 'foo');
        t.equal(value, 'xyz');
        t.end();
    });
    cache.set('foo', 'xyz');
});

tap.test('cache.set() - "changefeed : true" and key has value - "on.set" event should emit old and new value', (t) => {
    const cache = new Cache({ changefeed: true });
    cache.set('foo', 'bar');
    cache.on('set', (key, value) => {
        t.equal(key, 'foo');
        t.equal(value.oldVal, 'bar');
        t.equal(value.newVal, 'xyz');
        t.end();
    });
    cache.set('foo', 'xyz');
});

tap.test('cache.set() - "changefeed : true" and key does not have a value - "on.set" event should emit new value and "null" for old value', (t) => {
    const cache = new Cache({ changefeed: true });
    cache.on('set', (key, value) => {
        t.equal(key, 'foo');
        t.equal(value.oldVal, null);
        t.equal(value.newVal, 'xyz');
        t.end();
    });
    cache.set('foo', 'xyz');
});

tap.test('cache.set() - "changefeed : true" and item has expired - "on.set" event should emit new value and "null" for old value', (t) => {
    const clock = lolex.install();
    const cache = new Cache({ ttl: 2 * 1000, changefeed: true });
    cache.set('foo', 'bar');

    cache.on('set', (key, value) => {
        t.equal(key, 'foo');
        t.equal(value.oldVal, null);
        t.equal(value.newVal, 'xyz');
        clock.uninstall();
        t.end();
    });

    clock.tick(3000);

    cache.set('foo', 'xyz');
});

tap.test('cache.set() - "changefeed : true, stale : true" and item has expired - "on.set" event should emit old and new value', (t) => {
    const clock = lolex.install();
    const cache = new Cache({ ttl: 2 * 1000, stale: true, changefeed: true });
    cache.set('foo', 'bar');

    cache.on('set', (key, value) => {
        t.equal(key, 'foo');
        t.equal(value.oldVal, 'bar');
        t.equal(value.newVal, 'xyz');
        clock.uninstall();
        t.end();
    });

    clock.tick(3000);

    cache.set('foo', 'xyz');
});


/**
 * .get()
 */

tap.test('cache.get() - get set value - should return set value', (t) => {
    const cache = new Cache();
    cache.set('foo', 'bar');
    t.equal(cache.get('foo'), 'bar');
    t.end();
});

tap.test('cache.get() - get value until timeout - should return value until timeout', (t) => {
    const clock = lolex.install();
    const cache = new Cache({ ttl: 2 * 1000 });

    const key = 'foo';
    const value = 'bar';

    cache.set(key, value);
    t.equal(cache.get(key), value);

    clock.tick(1000);
    t.equal(cache.get(key), value);

    clock.tick(3000);
    t.equal(cache.get(key), null);
    clock.uninstall();

    t.end();
});

tap.test('cache.get() - get value until timeout - should emit dispose event on timeout', (t) => {
    const clock = lolex.install();

    const cache = new Cache({ ttl: 2 * 1000 });
    cache.on('dispose', (key) => {
        t.equal(key, 'foo');
        t.end();
    });

    cache.set('foo', 'bar');

    clock.tick(2500);
    cache.get('foo');

    clock.uninstall();
});

tap.test('cache.get() - cache set to return stale items - should return item once after timeout', (t) => {
    const clock = lolex.install();
    const cache = new Cache({ ttl: 2 * 1000, stale: true });

    const key = 'foo';
    const value = 'bar';

    cache.set(key, value);
    t.equal(cache.get(key), value);

    clock.tick(3000);
    t.equal(cache.get(key), value);

    t.equal(cache.get(key), null);
    clock.uninstall();

    t.end();
});



/**
 * .del()
 */

tap.test('cache.del() - remove set value - should remove value', (t) => {
    const cache = new Cache();
    cache.set('foo', 'bar');
    cache.del('foo');
    t.equal(cache.store.get('foo'), undefined);
    t.end();
});

tap.test('cache.del() - remove set value - should return true', (t) => {
    const cache = new Cache();
    cache.set('foo', 'bar');
    t.equal(cache.del('foo'), true);
    t.end();
});

tap.test('cache.del() - remove unset value - should return false', (t) => {
    const cache = new Cache();
    cache.set('foo', 'bar');
    t.equal(cache.del('bar'), false);
    t.end();
});

tap.test('cache.del() - remove set value - should emit dispose event on removal', (t) => {
    const cache = new Cache();
    cache.on('dispose', (key, item) => {
        t.equal(key, 'foo');
        t.equal(item, 'bar');
        t.end();
    });

    cache.set('foo', 'bar');
    cache.del('foo');
});



/**
 * .entries()
 */

tap.test('cache.entries() - get all entries - should return all entries as an Array', (t) => {
    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo', 2 * 1000);
    cache.set('c', 'xyz');

    const entries = cache.entries();

    t.equal(entries[0], 'bar');
    t.equal(entries[1], 'foo');
    t.equal(entries[2], 'xyz');

    t.end();
});

tap.test('cache.entries() - get all entries until timeout - should not return purged entries', (t) => {
    const clock = lolex.install();

    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo', 2 * 1000);
    cache.set('c', 'xyz');

    const entries1 = cache.entries();
    t.equal(entries1.length, 3);

    clock.tick(3000);

    const entries2 = cache.entries();
    t.equal(entries2.length, 2);

    clock.uninstall();
    t.end();
});

tap.test('cache.entries() - get all entries until timeout - should emit dispose event on timeout', (t) => {
    const clock = lolex.install();

    const cache = new Cache();
    cache.on('dispose', (key) => {
        t.equal(key, 'b');
        t.end();
    });

    cache.set('a', 'bar');
    cache.set('b', 'foo', 2 * 1000);
    cache.set('c', 'xyz');

    clock.tick(3000);

    cache.entries();

    clock.uninstall();
});

tap.test('cache.entries() - call with mutator function - should mutate result', (t) => {
    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo', 2 * 1000);
    cache.set('c', 'xyz');

    const entries = cache.entries((value) => {
        return `prefix-${value}`;
    });

    t.equal(entries.length, 3);

    t.equal(entries[0], 'prefix-bar');
    t.equal(entries[1], 'prefix-foo');
    t.equal(entries[2], 'prefix-xyz');

    t.end();
});

tap.test('cache.entries() - cache set to return stale items - purged items should be returned once', (t) => {
    const clock = lolex.install();

    const cache = new Cache({ stale: true });
    cache.set('a', 'bar');
    cache.set('b', 'foo', 2 * 1000);
    cache.set('c', 'xyz');

    const entries1 = cache.entries((value) => {
        return `prefix-${value}`;
    });
    t.equal(entries1[0], 'prefix-bar');
    t.equal(entries1[1], 'prefix-foo');
    t.equal(entries1[2], 'prefix-xyz');
    t.equal(entries1.length, 3);

    clock.tick(3000);

    const entries2 = cache.entries((value) => {
        return `prefix-${value}`;
    });
    t.equal(entries2[0], 'prefix-bar');
    t.equal(entries2[1], 'prefix-foo');
    t.equal(entries2[2], 'prefix-xyz');
    t.equal(entries2.length, 3);

    const entries3 = cache.entries((value) => {
        return `prefix-${value}`;
    });
    t.equal(entries3[0], 'prefix-bar');
    t.equal(entries3[1], 'prefix-xyz');
    t.equal(entries3.length, 2);

    clock.uninstall();
    t.end();
});

tap.test('cache.entries() - cache set to return stale items, call with mutator - purged items should be mutated and returned once', (t) => {
    const clock = lolex.install();

    const cache = new Cache({ stale: true });
    cache.set('a', 'bar');
    cache.set('b', 'foo', 2 * 1000);
    cache.set('c', 'xyz');

    const entries1 = cache.entries();
    t.equal(entries1.length, 3);

    clock.tick(3000);

    const entries2 = cache.entries();
    t.equal(entries2.length, 3);

    const entries3 = cache.entries();
    t.equal(entries3.length, 2);

    clock.uninstall();
    t.end();
});


/**
 * .prune()
 */

tap.test('cache.prune() - prune all entries - should remove expired items', (t) => {
    const clock = lolex.install();

    const cache = new Cache();
    cache.set('a', 'bar', 1000);
    cache.set('b', 'foo', 5000);
    cache.set('c', 'xyz', 1000);

    clock.tick(3000);

    cache.prune();

    t.equal(cache.get('a'), null);
    t.equal(cache.get('b'), 'foo');
    t.equal(cache.get('c'), null);

    clock.uninstall();
    t.end();
});



/**
 * .clear()
 */

tap.test('cache.clear() - clear cache - should empty cache', (t) => {
    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo');

    cache.clear();

    t.equal(cache.get('a'), null);
    t.equal(cache.get('b'), null);

    t.end();
});

tap.test('cache.clear() - clear cache - should emit "clear" event', (t) => {
    const cache = new Cache();
    cache.on('clear', () => {
        t.equal(cache.get('a'), null);
        t.equal(cache.get('b'), null);
        t.end();
    });

    cache.set('a', 'bar');
    cache.set('b', 'foo');

    cache.clear();
});



/**
 * .dump()
 */

tap.test('cache.dump() - dump cache - should return Array with all entries', (t) => {
    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo');

    const dump = cache.dump();

    t.true(Array.isArray(dump));
    t.equal(dump.length, 2);
    t.end();
});

tap.test('cache.dump() - entries in the dumped Array - should be an Array with the "key" as first item and "entry" Object as second item', (t) => {
    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo');

    const dump = cache.dump();

    t.equal(dump[0].length, 2);
    t.equal(dump[1].length, 2);

    t.type(dump[0][0], 'string');
    t.type(dump[1][0], 'string');

    t.type(dump[0][1], 'object');
    t.type(dump[1][1], 'object');

    t.end();
});

tap.test('cache.dump() - dumped entries - should have all properties of the Entry object', (t) => {
    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo');

    const dump = cache.dump();

    t.equal(dump[0][1].key, 'a');
    t.equal(dump[1][1].key, 'b');

    t.equal(dump[0][1].value, 'bar');
    t.equal(dump[1][1].value, 'foo');

    t.type(dump[0][1].ttl, 'number');
    t.type(dump[1][1].ttl, 'number');

    t.type(dump[0][1].origin, 'string');
    t.type(dump[1][1].origin, 'string');

    t.type(dump[0][1].expires, 'number');
    t.type(dump[1][1].expires, 'number');

    t.end();
});



/**
 * .load()
 */

tap.test('cache.load() - load invalid value to "items" argument - should throw', (t) => {
    const cache = new Cache();
    t.throws(() => {
        cache.load('fail');
    }, new Error('Argument "items" is not an Array'));
    t.end();
});

tap.test('cache.load() - load entries - should set entries in cache', (t) => {
    const clock = lolex.install();
    const dump = [
        ['a', {
            key: 'a', value: 'bar', ttl: 2000, origin: 'org', expires: 2000
        }],
        ['b', {
            key: 'b', value: 'foo', ttl: 2000, origin: 'org', expires: 2000
        }],
    ];

    const cache = new Cache();
    cache.load(dump);

    t.equal(cache.get('a'), 'bar');
    t.equal(cache.get('b'), 'foo');

    clock.uninstall();
    t.end();
});

tap.test('cache.load() - load entries - should return Array of keys inserted into cache', (t) => {
    const dump = [
        ['a', {
            key: 'a', value: 'bar', ttl: 2000, origin: 'org', expires: 2000
        }],
        ['b', {
            key: 'b', value: 'foo', ttl: 2000, origin: 'org', expires: 2000
        }],
    ];

    const cache = new Cache();
    const arr = cache.load(dump);

    t.equal(arr[0], 'a');
    t.equal(arr[1], 'b');

    t.end();
});

tap.test('cache.load() - one entry is missing "key" - should set valid entries in cache', (t) => {
    const dump = [
        ['a', {
            key: 'a', value: 'bar', ttl: 2000, origin: 'org', expires: 2000
        }],
        [{
            key: 'b', value: 'foo', ttl: 2000, origin: 'org', expires: 2000
        }],
        ['c', {
            key: 'c', value: 'xyz', ttl: 2000, origin: 'org', expires: 2000
        }],
    ];

    const cache = new Cache();
    const arr = cache.load(dump);

    t.equal(arr.length, 2);
    t.equal(arr[0], 'a');
    t.equal(arr[1], 'c');

    t.end();
});

tap.test('cache.load() - one entry is missing "values" - should set valid entries in cache', (t) => {
    const dump = [
        ['a', {
            key: 'a', value: 'bar', ttl: 2000, origin: 'org', expires: 2000
        }],
        ['b'],
        ['c', {
            key: 'c', value: 'xyz', ttl: 2000, origin: 'org', expires: 2000
        }],
    ];

    const cache = new Cache();
    const arr = cache.load(dump);

    t.equal(arr.length, 2);
    t.equal(arr[0], 'a');
    t.equal(arr[1], 'c');

    t.end();
});

tap.test('cache.load() - one entry is missing "values.value" - should set valid entries in cache', (t) => {
    const dump = [
        ['a', {
            key: 'a', value: 'bar', ttl: 2000, origin: 'org', expires: 2000
        }],
        ['b', {
            key: 'b', ttl: 2000, origin: 'org', expires: 2000
        }],
        ['c', {
            key: 'c', value: 'xyz', ttl: 2000, origin: 'org', expires: 2000
        }],
    ];

    const cache = new Cache();
    const arr = cache.load(dump);

    t.equal(arr.length, 2);
    t.equal(arr[0], 'a');
    t.equal(arr[1], 'c');

    t.end();
});

tap.test('cache.load() - one entry is missing "values.ttl" - should set valid entries in cache', (t) => {
    const dump = [
        ['a', {
            key: 'a', value: 'bar', ttl: 2000, origin: 'org', expires: 2000
        }],
        ['b', {
            key: 'b', value: 'bar', origin: 'org'
        }],
        ['c', {
            key: 'c', value: 'xyz', ttl: 2000, origin: 'org', expires: 2000
        }],
    ];

    const cache = new Cache();
    const arr = cache.load(dump);

    t.equal(arr.length, 2);
    t.equal(arr[0], 'a');
    t.equal(arr[1], 'c');

    t.end();
});



/**
 * .dump() > .load()
 */


tap.test('cache.dump().load() - dump entries from one cache - should import into secondary cache', (t) => {
    const cacheA = new Cache();
    const cacheB = new Cache();

    cacheA.set('a', 'bar');
    cacheA.set('b', 'foo');
    cacheB.load(cacheA.dump());

    t.equal(cacheB.get('a'), 'bar');
    t.equal(cacheB.get('b'), 'foo');

    t.end();
});

tap.test('cache.dump().load() - dump entries from one cache - should import into secondary cache and overwrite existing entries', (t) => {
    const cacheA = new Cache();
    const cacheB = new Cache();

    cacheA.set('a', 'bar');
    cacheA.set('b', 'foo');

    cacheB.set('a', 'xyz');
    cacheB.set('b', 'zyx');

    t.equal(cacheB.get('a'), 'xyz');
    t.equal(cacheB.get('b'), 'zyx');

    cacheB.load(cacheA.dump());

    t.equal(cacheB.get('a'), 'bar');
    t.equal(cacheB.get('b'), 'foo');

    t.end();
});



/**
 * .length()
 */

tap.test('cache.length() - have entries in cache - should return number of entries in cache', (t) => {
    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo');

    t.equal(cache.length(), 2);
    t.end();
});

tap.test('cache.length() - no entries in cache - should return 0', (t) => {
    const cache = new Cache();
    t.equal(cache.length(), 0);
    t.end();
});



/**
 * ._write() - Stream - objectMode: true
 */

tap.test('_write() - objectMode: true - pipe valid objects to cache - objects should be set in cache', (t) => {
    const cache = new Cache();
    const src = srcObjectStream([{ key: 'a', value: 'foo' }, { key: 'b', value: 'bar' }]);

    src.on('end', () => {
        t.equal(cache.get('a'), 'foo');
        t.equal(cache.get('b'), 'bar');
        t.end();
    });

    src.pipe(cache);
});

tap.test('_write() - objectMode: true - pipe object without "value" - should remove object from cache', (t) => {
    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo');
    cache.set('c', 'xyz');
    const src = srcObjectStream([{ key: 'a' }]);

    cache.on('dispose', (key) => {
        t.equal(key, 'a');
        t.equal(cache.get('a'), null);
        t.end();
    });

    src.pipe(cache);
});

tap.test('_write() - objectMode: true - pipe object where "value" is "null" - should remove object from cache', (t) => {
    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo');
    cache.set('c', 'xyz');
    const src = srcObjectStream([{ key: 'a', value: null }]);

    cache.on('dispose', (key) => {
        t.equal(key, 'a');
        t.equal(cache.get('a'), null);
        t.end();
    });

    src.pipe(cache);
});

tap.test('_write() - objectMode: true - pipe object where "value" is "undefined" - should remove object from cache', (t) => {
    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo');
    cache.set('c', 'xyz');
    const src = srcObjectStream([{ key: 'a', value: undefined }]);

    cache.on('dispose', (key) => {
        t.equal(key, 'a');
        t.equal(cache.get('a'), null);
        t.end();
    });

    src.pipe(cache);
});

tap.test('_write() - objectMode: true - pipe object without "key" - should emit error and not write object to cache', (t) => {
    const cache = new Cache();
    const src = srcObjectStream([{ id: 'a', value: 'foo' }]);

    cache.on('error', (error) => {
        t.equal(error.message, 'Object does not contain a "key" property or the value for "key" is null or undefined');
        t.equal(cache.get('a'), null);
        t.end();
    });

    src.pipe(cache);
});

tap.test('_write() - objectMode: true - pipe object where "key" is "null" - should emit error and not write object to cache', (t) => {
    const cache = new Cache();
    const src = srcObjectStream([{ key: null, value: 'foo' }]);

    cache.on('error', () => {
        t.equal(cache.get('a'), null);
        t.end();
    });

    src.pipe(cache);
});

tap.test('_write() - objectMode: true - pipe object where "key" is "undefined" - should emit error and not write object to cache', (t) => {
    const cache = new Cache();
    const src = srcObjectStream([{ key: undefined, value: 'foo' }]);

    cache.on('error', () => {
        t.equal(cache.get('a'), null);
        t.end();
    });

    src.pipe(cache);
});



/**
 * ._write() - Stream - objectMode: false
 */

tap.test('_write() - objectMode: false - pipe valid objects to cache - objects should be set in cache', (t) => {
    const cache = new Cache({ objectMode: false });
    const src = srcObjectStream([
        Buffer.from(JSON.stringify({ key: 'a', value: 'foo' })),
        Buffer.from(JSON.stringify({ key: 'b', value: 'bar' })),
    ]);

    src.on('end', () => {
        t.equal(cache.get('a'), 'foo');
        t.equal(cache.get('b'), 'bar');
        t.end();
    });

    src.pipe(cache);
});

tap.test('_write() - objectMode: false - pipe object without "value" - should remove object from cache', (t) => {
    const cache = new Cache({ objectMode: false });
    cache.set('a', 'bar');
    cache.set('b', 'foo');
    cache.set('c', 'xyz');
    const src = srcObjectStream([
        Buffer.from(JSON.stringify({ key: 'a' }))
    ]);

    cache.on('dispose', (key) => {
        t.equal(key, 'a');
        t.equal(cache.get('a'), null);
        t.end();
    });

    src.pipe(cache);
});

tap.test('_write() - objectMode: false - pipe buffer containing non compatible JSON - should emit error and not write object to cache', (t) => {
    const cache = new Cache({ objectMode: false });
    const src = srcBufferStream([
        Buffer.from(JSON.stringify({ key: undefined, value: 'foo' }))
    ]);

    cache.on('error', () => {
        t.equal(cache.get('a'), null);
        t.end();
    });

    src.pipe(cache);
});

tap.test('_write() - objectMode: false - pipe buffer non JSON string - should emit error and not write object to cache', (t) => {
    const cache = new Cache({ objectMode: false });
    const src = srcBufferStream([
        Buffer.from('foo')
    ]);

    cache.on('error', () => {
        t.equal(cache.get('a'), null);
        t.end();
    });

    src.pipe(cache);
});



/**
 * ._read() - Stream - objectMode: true
 */

tap.test('_read() - objectMode: true - pipe valid objects from cache - objects should be piped when set', (t) => {
    const cache = new Cache();
    const dest = destObjectStream((arr) => {
        t.equal(arr[0].key, 'a');
        t.equal(arr[0].value, 'foo');
        t.equal(arr[1].key, 'b');
        t.equal(arr[1].value, 'bar');
        t.end();
    });

    cache.pipe(dest);
    cache.set('a', 'foo');
    cache.set('b', 'bar');

    setImmediate(() => {
        dest.end();
    });
});

tap.test('_read() - objectMode: true - set item when no stream is attached to Readable stream - should be no items in internal stream buffer', (t) => {
    const cache = new Cache();
    cache.set('a', 'foo');
    cache.set('a', 'bar');
    t.equal(cache._readableState.buffer.length, 0);
    t.end();
});



/**
 * ._read() - Stream - objectMode: false
 */

tap.test('_read() - objectMode: false - pipe valid objects from cache - objects should be piped when set', (t) => {
    const cache = new Cache({ objectMode: false });
    const dest = destBufferStream((arr) => {
        const item0 = JSON.parse(arr[0].toString());
        const item1 = JSON.parse(arr[1].toString());
        t.equal(item0.key, 'a');
        t.equal(item0.value, 'foo');
        t.equal(item1.key, 'b');
        t.equal(item1.value, 'bar');
        t.end();
    });

    cache.pipe(dest);
    cache.set('a', 'foo');
    cache.set('b', 'bar');

    setImmediate(() => {
        dest.end();
    });
});



/**
 * ._write().pipe(_read()) - Stream - objectMode: true
 */

tap.test('._write().pipe(_read()) - objectMode: true - pipe valid objects through cache - objects should be piped through and stored in cache', (t) => {
    const cache = new Cache();
    const src = srcObjectStream([{ key: 'a', value: 'foo' }, { key: 'b', value: 'bar' }, { key: 'c', value: 'xyz' }]);
    const dest = destObjectStream((arr) => {
        t.equal(arr[0].key, 'a');
        t.equal(arr[0].value, 'foo');
        t.equal(arr[1].key, 'b');
        t.equal(arr[1].value, 'bar');
        t.equal(arr[2].key, 'c');
        t.equal(arr[2].value, 'xyz');
        t.equal(cache.get('a'), 'foo');
        t.equal(cache.get('b'), 'bar');
        t.equal(cache.get('c'), 'xyz');
        t.end();
    });

    src.pipe(cache).pipe(dest);

    setImmediate(() => {
        dest.end();
    });
});

tap.test('._write().pipe(_read()) - objectMode: true - circular pipe - set item - objects should be set in all caches', (t) => {
    const cacheA = new Cache();
    const cacheB = new Cache();
    const cacheC = new Cache();
    const cacheD = new Cache();

    cacheA.pipe(cacheB).pipe(cacheC).pipe(cacheD).pipe(cacheA);

    cacheB.set('a', 'foo');
    cacheA.on('set', () => {
        t.equal(cacheA.get('a'), 'foo');
        t.equal(cacheB.get('a'), 'foo');
        t.equal(cacheC.get('a'), 'foo');
        t.equal(cacheD.get('a'), 'foo');
        t.end();
    });
});

tap.test('._write().pipe(_read()) - objectMode: true - circular pipe - del item - objects should be removed from all caches', (t) => {
    const cacheA = new Cache();
    const cacheB = new Cache();
    const cacheC = new Cache();
    const cacheD = new Cache();

    cacheA.pipe(cacheB).pipe(cacheC).pipe(cacheD).pipe(cacheA);

    cacheB.set('a', 'foo');
    cacheA.on('set', () => {
        t.equal(cacheA.get('a'), 'foo');
        t.equal(cacheB.get('a'), 'foo');
        t.equal(cacheC.get('a'), 'foo');
        t.equal(cacheD.get('a'), 'foo');
        cacheD.del('a');
    });

    cacheC.on('dispose', () => {
        t.equal(cacheA.get('a'), null);
        t.equal(cacheB.get('a'), null);
        t.equal(cacheC.get('a'), null);
        t.equal(cacheD.get('a'), null);
        t.end();
    });
});



/**
 * ._write().pipe(_read()) - Stream - objectMode: false
 */

tap.test('._write().pipe(_read()) - objectMode: false - circular pipe - set item - objects should be set in all caches', (t) => {
    const cacheA = new Cache({ objectMode: false });
    const cacheB = new Cache({ objectMode: false });
    const cacheC = new Cache({ objectMode: false });
    const cacheD = new Cache({ objectMode: false });

    cacheA.pipe(cacheB).pipe(cacheC).pipe(cacheD).pipe(cacheA);

    cacheB.set('a', 'foo');
    cacheA.on('set', () => {
        t.equal(cacheA.get('a'), 'foo');
        t.equal(cacheB.get('a'), 'foo');
        t.equal(cacheC.get('a'), 'foo');
        t.equal(cacheD.get('a'), 'foo');
        t.end();
    });
});

tap.test('._write().pipe(_read()) - objectMode: false - circular pipe - del item - objects should be removed from all caches', (t) => {
    const cacheA = new Cache({ objectMode: false });
    const cacheB = new Cache({ objectMode: false });
    const cacheC = new Cache({ objectMode: false });
    const cacheD = new Cache({ objectMode: false });

    cacheA.pipe(cacheB).pipe(cacheC).pipe(cacheD).pipe(cacheA);

    cacheB.set('a', 'foo');
    cacheA.on('set', () => {
        t.equal(cacheA.get('a'), 'foo');
        t.equal(cacheB.get('a'), 'foo');
        t.equal(cacheC.get('a'), 'foo');
        t.equal(cacheD.get('a'), 'foo');
        cacheD.del('a');
    });

    cacheC.on('dispose', () => {
        t.equal(cacheA.get('a'), null);
        t.equal(cacheB.get('a'), null);
        t.equal(cacheC.get('a'), null);
        t.equal(cacheD.get('a'), null);
        t.end();
    });
});

tap.test(
    '.pipe() - exceed the default, 10, number of max event listeners - should not cause the process to emit a MaxListenersExceededWarning',
    (t) => {
        const cacheA = new Cache();
        const cacheB = new Cache();
        const cacheC = new Cache();
        const cacheD = new Cache();
        const cacheE = new Cache();
        const cacheF = new Cache();
        const cacheG = new Cache();
        const cacheH = new Cache();
        const cacheI = new Cache();
        const cacheJ = new Cache();
        const cacheK = new Cache();
        const cacheL = new Cache();
        const cacheM = new Cache();
        const cacheN = new Cache();

        const cacheX = new Cache();

        process.on('warning', (warning) => {
            if (warning.name === 'MaxListenersExceededWarning') {
                t.fail();
            }
        });

        const dest = destObjectStream((result) => {
            t.equal(result.length, 14);
            t.end();
        });

        cacheA.on('error', (error) => { console.log('a error', error); });
        cacheB.on('error', (error) => { console.log('b error', error); });
        cacheC.on('error', (error) => { console.log('c error', error); });
        cacheD.on('error', (error) => { console.log('d error', error); });
        cacheE.on('error', (error) => { console.log('e error', error); });
        cacheF.on('error', (error) => { console.log('f error', error); });
        cacheG.on('error', (error) => { console.log('g error', error); });
        cacheH.on('error', (error) => { console.log('h error', error); });
        cacheI.on('error', (error) => { console.log('i error', error); });
        cacheJ.on('error', (error) => { console.log('j error', error); });
        cacheK.on('error', (error) => { console.log('k error', error); });
        cacheL.on('error', (error) => { console.log('l error', error); });
        cacheM.on('error', (error) => { console.log('m error', error); });
        cacheN.on('error', (error) => { console.log('n error', error); });
        cacheX.on('error', (error) => { console.log('x error', error); });

        cacheA.pipe(cacheX);
        cacheB.pipe(cacheX);
        cacheC.pipe(cacheX);
        cacheD.pipe(cacheX);
        cacheE.pipe(cacheX);
        cacheF.pipe(cacheX);
        cacheG.pipe(cacheH).pipe(cacheI).pipe(cacheJ).pipe(cacheX);
        cacheK.pipe(cacheX);
        cacheL.pipe(cacheM).pipe(cacheX);
        cacheN.pipe(cacheX);

        cacheX.pipe(dest);

        cacheA.set('a_test', { name: 'a_test', description: '.' });
        cacheB.set('b_test', { name: 'b_test', description: '.' });
        cacheC.set('c_test', { name: 'c_test', description: '.' });
        cacheD.set('d_test', { name: 'd_test', description: '.' });
        cacheE.set('e_test', { name: 'e_test', description: '.' });
        cacheF.set('f_test', { name: 'f_test', description: '.' });
        cacheG.set('g_test', { name: 'g_test', description: '.' });
        cacheH.set('h_test', { name: 'h_test', description: '.' });
        cacheI.set('i_test', { name: 'i_test', description: '.' });
        cacheJ.set('j_test', { name: 'j_test', description: '.' });
        cacheK.set('k_test', { name: 'k_test', description: '.' });
        cacheL.set('l_test', { name: 'l_test', description: '.' });
        cacheM.set('m_test', { name: 'm_test', description: '.' });
        cacheN.set('n_test', { name: 'n_test', description: '.' });

        setImmediate(() => {
            dest.end();
        });
    },
);
