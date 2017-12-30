'use strict';

const Entry = require('../lib/entry');
const lolex = require('lolex');
const tap = require('tap');

/**
 * Constructor
 */

tap.test('entry() - object type - should be TtlMemCacheEntry', (t) => {
    const entry = new Entry();
    t.equal(Object.prototype.toString.call(entry), '[object TtlMemCacheEntry]');
    t.end();
});

tap.test('entry() - no values - should set defaults', (t) => {
    const clock = lolex.install();
    clock.tick(1000);

    const entry = new Entry();
    t.type(entry.key, 'undefined');
    t.type(entry.value, 'null');
    t.type(entry.origin, 'null');

    t.equal(entry.ttl, -1);
    t.equal(entry.expires, 999);

    clock.uninstall();
    t.end();
});

tap.test('entry() - define all values - should set all values', (t) => {
    const entry = new Entry({
        key: 'a',
        value: 'foo',
        ttl: 1000,
        origin: 'source',
        expires: 3000,
    });
    t.equal(entry.key, 'a');
    t.equal(entry.value, 'foo');
    t.equal(entry.origin, 'source');

    t.equal(entry.ttl, 1000);
    t.equal(entry.expires, 3000);

    t.end();
});

tap.test('entry() - define all values except expires - should set all values and calculate expires', (t) => {
    const clock = lolex.install();
    clock.tick(1000);

    const entry = new Entry({
        key: 'a',
        value: 'foo',
        ttl: 1000,
        origin: 'source',
    });
    t.equal(entry.key, 'a');
    t.equal(entry.value, 'foo');
    t.equal(entry.origin, 'source');

    t.equal(entry.ttl, 1000);
    t.equal(entry.expires, 2000);

    clock.uninstall();
    t.end();
});

/**
 * Setters
 */

tap.test('entry.key - set value on "key" property - should throw', (t) => {
    const entry = new Entry({
        key: 'a',
        value: 'foo',
        ttl: 1000,
        origin: 'source',
    });
    t.throws(() => {
        entry.key = 'b';
    }, new Error('Cannot set read-only property.'));
    t.end();
});

tap.test('entry.value - set value on "value" property - should throw', (t) => {
    const entry = new Entry({
        key: 'a',
        value: 'foo',
        ttl: 1000,
        origin: 'source',
    });
    t.throws(() => {
        entry.value = 'bar';
    }, new Error('Cannot set read-only property.'));
    t.end();
});

tap.test('entry.ttl - set value on "ttl" property - should throw', (t) => {
    const entry = new Entry({
        key: 'a',
        value: 'foo',
        ttl: 1000,
        origin: 'source',
    });
    t.throws(() => {
        entry.ttl = 2000;
    }, new Error('Cannot set read-only property.'));
    t.end();
});

tap.test('entry.origin - set value on "origin" property - should throw', (t) => {
    const entry = new Entry({
        key: 'a',
        value: 'foo',
        ttl: 1000,
        origin: 'source',
    });
    t.throws(() => {
        entry.origin = 'src';
    }, new Error('Cannot set read-only property.'));
    t.end();
});

tap.test('entry.expires - set value on "expires" property - should throw', (t) => {
    const entry = new Entry({
        key: 'a',
        value: 'foo',
        ttl: 1000,
        origin: 'source',
    });
    t.throws(() => {
        entry.expires = 2000;
    }, new Error('Cannot set read-only property.'));
    t.end();
});

/**
 * .expired()
 */

tap.test('.expired() - expire time is in front of now - should return "false"', (t) => {
    const clock = lolex.install();

    const entry = new Entry({
        key: 'a',
        value: 'foo',
        ttl: 2000,
        origin: 'source',
    });

    clock.tick(1000);

    t.false(entry.expired());

    clock.uninstall();
    t.end();
});

tap.test('.expired() - expire time is behind of now - should return "true"', (t) => {
    const clock = lolex.install();

    const entry = new Entry({
        key: 'a',
        value: 'foo',
        ttl: 2000,
        origin: 'source',
    });

    clock.tick(4000);

    t.true(entry.expired());

    clock.uninstall();
    t.end();
});

tap.test('.expired() - "now" argument is provided - expire time is in front of now - should return "false"', (t) => {
    const clock = lolex.install();

    const entry = new Entry({
        key: 'a',
        value: 'foo',
        ttl: 2000,
        origin: 'source',
    });

    clock.tick(4000);

    t.false(entry.expired(1000));

    clock.uninstall();
    t.end();
});

tap.test('.expired() - "now" argument is provided - expire time is behind of now - should return "true"', (t) => {
    const clock = lolex.install();

    const entry = new Entry({
        key: 'a',
        value: 'foo',
        ttl: 2000,
        origin: 'source',
    });

    clock.tick(1000);

    t.true(entry.expired(4000));

    clock.uninstall();
    t.end();
});

/**
 * .toJSON()
 */

tap.test('.toJSON() - call method - should return an object literal of the Entry object', (t) => {
    const clock = lolex.install();
    clock.tick(1000);

    const entry = new Entry({
        key: 'a',
        value: 'foo',
        ttl: 2000,
        origin: 'source',
    });

    const result = entry.toJSON();

    t.type(result, 'object');
    t.equal(result.key, 'a');
    t.equal(result.value, 'foo');
    t.equal(result.ttl, 2000);
    t.equal(result.origin, 'source');
    t.equal(result.expires, 3000);

    clock.uninstall();
    t.end();
});

tap.test('.toJSON() - call method - should append a "type" property with "TtlMemCacheEntry" as value', (t) => {
    const entry = new Entry({
        key: 'a',
        value: 'foo',
        ttl: 2000,
        origin: 'source',
    });

    const result = entry.toJSON();

    t.equal(result.type, 'TtlMemCacheEntry');
    t.end();
});

tap.test('.toJSON() - call JSON.stringify on Entry object - should return a String representation of the Entry object', (t) => {
    const clock = lolex.install();
    clock.tick(1000);

    const entry = new Entry({
        key: 'a',
        value: 'foo',
        ttl: 2000,
        origin: 'source',
    });

    const result = JSON.stringify(entry);
    t.equal(result, '{"key":"a","value":"foo","ttl":2000,"origin":"source","expires":3000,"type":"TtlMemCacheEntry"}');

    clock.uninstall();
    t.end();
});
