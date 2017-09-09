'use strict';

const stream = require('readable-stream');
const Cache = require('../');
const lolex = require('lolex');
const tap = require('tap');

const srcStream = (arr) => {
    return new stream.Readable({
        objectMode : true,
        read(n) {
            arr.forEach((el) => {
                this.push(el);
            });
            this.push(null);
        }
    });
}

const destStream = (done) => {
    const arr = [];

    const dStream = new stream.Writable({
        objectMode : true,
        write(chunk, encoding, callback) {
            arr.push(chunk);
            callback();
        }
    });

    dStream.on('finish', () => {
        done(arr);
    });

    return dStream;
}



/**
 * Constructor
 */

tap.test('cache() - without maxAge - should set default maxAge', t => {
    const cache = new Cache();
    t.equal(cache.maxAge, (5 * 60 * 1000));
    t.end();
});

tap.test('cache() - with maxAge - should set default maxAge', t => {
    const maxAge = (60 * 60 * 1000);
    const cache = new Cache({ maxAge });
    t.equal(cache.maxAge, maxAge);
    t.end();
});



/**
 * .set()
 */

tap.test('cache.set() - without key - should throw', t => {
    const cache = new Cache();
    t.throws(() => {
        cache.set();
    }, new Error('Argument "key" cannot be null or undefined'));
    t.end();
});

tap.test('cache.set() - without value - should throw', t => {
    const cache = new Cache();
    t.throws(() => {
        cache.set('foo');
    }, new Error('Argument "value" cannot be null or undefined'));
    t.end();
});

tap.test('cache.set() - with key and value - should return the set value', t => {
    const cache = new Cache();
    const result = cache.set('foo', 'bar');
    t.equal(result, 'bar');
    t.end();
});

tap.test('cache.set() - with key and value - should set value on key in storage', t => {
    const cache = new Cache();
    cache.set('foo', 'bar');
    t.equal(cache.store.get('foo').value, 'bar');
    t.end();
});

tap.test('cache.set() - without maxAge - should set default maxAge', t => {
    const clock = lolex.install();
    clock.tick(100000);

    const cache = new Cache();
    cache.set('foo', 'bar');
    t.equal(cache.store.get('foo').expires, 400000); // default maxAge + lolex tick time

    clock.uninstall();
    t.end();
});

tap.test('cache.set() - with maxAge - should set maxAge', t => {
    const clock = lolex.install();
    clock.tick(100000);

    const cache = new Cache();
    cache.set('foo', 'bar', (60 * 60 * 1000));
    t.equal(cache.store.get('foo').expires, 3700000);

    clock.uninstall();
    t.end();
});

tap.test('cache.set() - call twice with different values - should cache value of first set', t => {
    const cache = new Cache();
    cache.set('foo', 'bar');
    cache.set('foo', 'xyz');
    t.equal(cache.store.get('foo').value, 'bar');
    t.end();
});




/**
 * .get()
 */

tap.test('cache.get() - get set value - should return set value', t => {
    const cache = new Cache();
    cache.set('foo', 'bar');
    t.equal(cache.get('foo'), 'bar');
    t.end();
});

tap.test('cache.get() - get value until timeout - should return value until timeout', t => {
    const clock = lolex.install();
    const cache = new Cache({ maxAge: 2 * 1000 });

    const key = 'foo';
    const value = 'bar';

    cache.set(key, value);
    t.equal(cache.get(key), value);

    clock.tick(1500);
    t.equal(cache.get(key), value);

    clock.tick(1000);
    t.equal(cache.get(key), undefined);
    clock.uninstall();

    t.end();
});

tap.test('cache.get() - get value until timeout - should emit dispose event on timeout', t => {
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



/**
 * .del()
 */

tap.test('cache.del() - remove set value - should remove value', t => {
    const cache = new Cache();
    cache.set('foo', 'bar');
    cache.del('foo');
    t.equal(cache.store.get('foo'), undefined);
    t.end();
});

tap.test('cache.del() - remove set value - should emit dispose event on removal', t => {
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

tap.test('cache.entries() - get all entries - should return all entries as an Array', t => {
    const clock = lolex.install();

    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo', 2 * 1000);
    cache.set('c', 'xyz');

    const entries = cache.entries();

    t.equal(entries[0][0], 'a');
    t.equal(entries[0][1], 'bar');

    t.equal(entries[1][0], 'b');
    t.equal(entries[1][1], 'foo');

    t.equal(entries[2][0], 'c');
    t.equal(entries[2][1], 'xyz');

    clock.uninstall();
    t.end();
});

tap.test('cache.entries() - get all entries until timeout - should not return purged entries', t => {
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

tap.test('cache.entries() - get all entries until timeout - should emit dispose event on timeout', t => {
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

tap.test('cache.entries() - call with mutator function - should mutate result', t => {
    const clock = lolex.install();

    const cache = new Cache();
    cache.set('a', 'bar');
    cache.set('b', 'foo', 2 * 1000);
    cache.set('c', 'xyz');

    const entries = cache.entries((key, value, timeout) => {
        return {
            key,
            value,
            timeout
        };
    });

    t.equal(entries.length, 3);

    t.equal(entries[0].key, 'a');
    t.equal(entries[0].value, 'bar');

    clock.uninstall();
    t.end();
});



/**
 * ._write() - Stream
 */

tap.test('_write() - pipe valid objects to cache - objects should be set in cache', t => {
    const cache = new Cache();
    const src = srcStream([{key:'a', value: 'foo'}, {key:'b', value: 'bar'}]);

    src.on('end', () => {
        t.equal(cache.get('a'), 'foo');
        t.equal(cache.get('b'), 'bar');
        t.end();
    });

    src.pipe(cache);
});



/**
 * ._read() - Stream
 */

tap.test('_read() - pipe valid objects from cache - objects should be piped when set', t => {
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
