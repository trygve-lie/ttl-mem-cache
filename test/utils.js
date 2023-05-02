'use strict';

const lolex = require('lolex');
const tap = require('tap');
const utils = require('../lib/utils');

/**
 * .calculateExpire()
 */

tap.test('utils.calculateExpire() - "maxAge" is Infinity - should return Infinity', (t) => {
    t.equal(utils.calculateExpire(Infinity), Infinity);
    t.end();
});

tap.test('utils.calculateExpire() - "maxAge" is a number - should return now timestamp plus the number', (t) => {
    const clock = lolex.install({ now: 2000 });

    t.equal(utils.calculateExpire(2000), 4000);

    clock.uninstall();
    t.end();
});

tap.test('utils.calculateExpire() - empty argument - should return now timestamp', (t) => {
    const clock = lolex.install({ now: 2000 });

    t.equal(utils.calculateExpire(), clock.now);

    clock.uninstall();
    t.end();
});

/**
 * .expired()
 */

tap.test('utils.expired() - empty argument - should return true', (t) => {
    t.ok(utils.expired());
    t.end();
});

tap.test('utils.expired() - "expires" is Infinity - should return false', (t) => {
    const expires = Infinity;
    t.notOk(utils.expired(expires));
    t.end();
});

tap.test('utils.expired() - "expires" is behind Date.now() - should return true', (t) => {
    const expires = Date.now() - 100000;
    t.ok(utils.expired(expires));
    t.end();
});

tap.test('utils.expired() - "expires" is in front of Date.now() - should return false', (t) => {
    const expires = Date.now() + 100000;
    t.notOk(utils.expired(expires));
    t.end();
});

/**
 * .isEmpty()
 */

tap.test('utils.isEmpty() - value is not empty - should return false', (t) => {
    t.notOk(utils.isEmpty('foo'));
    t.notOk(utils.isEmpty(1));
    t.notOk(utils.isEmpty({}));
    t.notOk(utils.isEmpty([1]));
    t.end();
});

tap.test('utils.isEmpty() - value is "null" - should return true', (t) => {
    t.ok(utils.isEmpty(null));
    t.end();
});

tap.test('utils.isEmpty() - value is "undefined" - should return true', (t) => {
    t.ok(utils.isEmpty(undefined));
    t.end();
});

/**
 * .isNotEmpty()
 */

tap.test('utils.isNotEmpty() - value is not empty - should return true', (t) => {
    t.ok(utils.isNotEmpty('foo'));
    t.ok(utils.isNotEmpty(1));
    t.ok(utils.isNotEmpty({}));
    t.ok(utils.isNotEmpty([1]));
    t.end();
});

tap.test('utils.isNotEmpty() - value is "null" - should return false', (t) => {
    t.notOk(utils.isNotEmpty(null));
    t.end();
});

tap.test('utils.isNotEmpty() - value is "undefined" - should return false', (t) => {
    t.notOk(utils.isNotEmpty(undefined));
    t.end();
});

/**
 * .isFunction()
 */

tap.test('utils.isFunction() - value is not a function - should return false', (t) => {
    t.notOk(utils.isFunction());
    t.notOk(utils.isFunction('foo'));
    t.notOk(utils.isFunction(1));
    t.notOk(utils.isFunction({}));
    t.notOk(utils.isFunction([1]));
    t.end();
});

tap.test('utils.isFunction() - value is a function - should return true', (t) => {
    const fn = function fn(x) {
        return x;
    };
    const arr = (x) => {
        return x;
    };
    t.ok(utils.isFunction(fn));
    t.ok(utils.isFunction(arr));
    t.end();
});
