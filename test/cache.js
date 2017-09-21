'use strict';

const stream = require('readable-stream');
const Cache = require('../');
const lolex = require('lolex');
const tap = require('tap');

const srcStream = (arr) => {
    return new stream.Readable({
        objectMode: true,
        read() {
            arr.forEach((el) => {
                this.push(el);
            });
            this.push(null);
        }
    });
};

const destStream = (done) => {
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



/**
 * Constructor
 */

tap.test('cache() - without maxAge - should set default maxAge', (t) => {
    const cache = new Cache();
    t.equal(cache.maxAge, (5 * 60 * 1000));
    t.end();
});

tap.test('cache() - with maxAge - should set default maxAge', (t) => {
    const maxAge = (60 * 60 * 1000);
    const cache = new Cache({ maxAge });
    t.equal(cache.maxAge, maxAge);
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

tap.test('cache.set() - without maxAge - should set default maxAge', (t) => {
    const clock = lolex.install();
    clock.tick(100000);

    const cache = new Cache();
    cache.set('foo', 'bar');
    t.equal(cache.store.get('foo').expires, 400000); // default maxAge + lolex tick time

    clock.uninstall();
    t.end();
});

tap.test('cache.set() - with maxAge - should set maxAge', (t) => {
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
    const cache = new Cache({ maxAge: 2 * 1000 });

    const key = 'foo';
    const value = 'bar';

    cache.set(key, value);
    t.equal(cache.get(key), value);

    clock.tick(1000);
    t.equal(cache.get(key), value);

    clock.tick(3000);
    t.equal(cache.get(key), undefined);
    clock.uninstall();

    t.end();
});

tap.test('cache.get() - get value until timeout - should emit dispose event on timeout', (t) => {
    const clock = lolex.install();

    const cache = new Cache({ maxAge: 2 * 1000 });
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
    const cache = new Cache({ maxAge: 2 * 1000, stale: true });

    const key = 'foo';
    const value = 'bar';

    cache.set(key, value);
    t.equal(cache.get(key), value);

    clock.tick(3000);
    t.equal(cache.get(key), value);

    t.equal(cache.get(key), undefined);
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

tap.test('cache.del() - remove set value - should emit dispose event on removal', (t) => {
    const cache = new Cache();
    cache.on('dispose', (key) => {
        t.equal(key, 'foo');
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

    t.equal(cache.get('a'), undefined);
    t.equal(cache.get('b'), 'foo');
    t.equal(cache.get('c'), undefined);

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

    t.equal(cache.get('a'), undefined);
    t.equal(cache.get('b'), undefined);

    t.end();
});

tap.test('cache.clear() - clear cache - should emit "clear" event', (t) => {
    const cache = new Cache();
    cache.on('clear', () => {
        t.equal(cache.get('a'), undefined);
        t.equal(cache.get('b'), undefined);
        t.end();
    });

    cache.set('a', 'bar');
    cache.set('b', 'foo');

    cache.clear();
});


/**
 * ._write() - Stream
 */

tap.test('_write() - pipe valid objects to cache - objects should be set in cache', (t) => {
    const cache = new Cache();
    const src = srcStream([{ key: 'a', value: 'foo' }, { key: 'b', value: 'bar' }]);

    src.on('end', () => {
        t.equal(cache.get('a'), 'foo');
        t.equal(cache.get('b'), 'bar');
        t.end();
    });

    src.pipe(cache);
});


tap.test('_write() - pipe object without "value" - should remove object from cache', (t) => {
    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo');
    cache.set('c', 'xyz');
    const src = srcStream([{ key: 'a' }]);

    cache.on('dispose', (key) => {
        t.equal(key, 'a');
        t.equal(cache.get('a'), undefined);
        t.end();
    });

    src.pipe(cache);
});


tap.test('_write() - pipe object where "value" is "null" - should remove object from cache', (t) => {
    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo');
    cache.set('c', 'xyz');
    const src = srcStream([{ key: 'a', value: null }]);

    cache.on('dispose', (key) => {
        t.equal(key, 'a');
        t.equal(cache.get('a'), undefined);
        t.end();
    });

    src.pipe(cache);
});


tap.test('_write() - pipe object where "value" is "undefined" - should remove object from cache', (t) => {
    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo');
    cache.set('c', 'xyz');
    const src = srcStream([{ key: 'a', value: undefined }]);

    cache.on('dispose', (key) => {
        t.equal(key, 'a');
        t.equal(cache.get('a'), undefined);
        t.end();
    });

    src.pipe(cache);
});

tap.test('_write() - pipe object without "key" - should emit error and not write object to cache', (t) => {
    const cache = new Cache();
    const src = srcStream([{ id: 'a', value: 'foo' }]);

    cache.on('error', (error) => {
        t.equal(error.message, 'Object does not contain a "key" property or the value for "key" is null or undefined');
        t.equal(cache.get('a'), undefined);
        t.end();
    });

    src.pipe(cache);
});

tap.test('_write() - pipe object where "key" is "null" - should emit error and not write object to cache', (t) => {
    const cache = new Cache();
    const src = srcStream([{ key: null, value: 'foo' }]);

    cache.on('error', () => {
        t.equal(cache.get('a'), undefined);
        t.end();
    });

    src.pipe(cache);
});

tap.test('_write() - pipe object where "key" is "undefined" - should emit error and not write object to cache', (t) => {
    const cache = new Cache();
    const src = srcStream([{ key: undefined, value: 'foo' }]);

    cache.on('error', () => {
        t.equal(cache.get('a'), undefined);
        t.end();
    });

    src.pipe(cache);
});



/**
 * ._read() - Stream
 */

tap.test('_read() - pipe valid objects from cache - objects should be piped when set', (t) => {
    const cache = new Cache();
    const dest = destStream((arr) => {
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



/**
 * ._write().pipe(_read()) - Stream
 */

tap.test('._write().pipe(_read()) - pipe valid objects through cache - objects should be piped through and stored in cache', (t) => {
    const cache = new Cache();
    const src = srcStream([{ key: 'a', value: 'foo' }, { key: 'b', value: 'bar' }, { key: 'c', value: 'xyz' }]);
    const dest = destStream((arr) => {
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



/**
 * ._calculateExpire()
 */

tap.test('_calculateExpire() - "maxAge" is Infinity - should return Infinity', (t) => {
    t.equal(Cache._calculateExpire(Infinity), Infinity);
    t.end();
});

tap.test('_calculateExpire() - "maxAge" is a number - should return now timestamp plus the number', (t) => {
    const clock = lolex.install({ now: 2000 });

    t.equal(Cache._calculateExpire(2000), 4000);

    clock.uninstall();
    t.end();
});



/**
 * ._validate()
 */

tap.test('_validate() - empty argument - should return false', (t) => {
    t.equal(Cache._validate(), false);
    t.end();
});

tap.test('_validate() - "expires" is Infinity - should return false', (t) => {
    const expires = Infinity;
    t.equal(Cache._validate({ expires }), false);
    t.end();
});

tap.test('_validate() - "expires" is behind Date.now() - should return false', (t) => {
    const expires = Date.now() - 100000;
    t.equal(Cache._validate({ expires }), false);
    t.end();
});

tap.test('_validate() - "expires" is in front of Date.now() - should return true', (t) => {
    const expires = Date.now() + 100000;
    t.equal(Cache._validate({ expires }), true);
    t.end();
});
