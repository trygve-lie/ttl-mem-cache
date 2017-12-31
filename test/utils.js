'use strict';

const utils = require('../lib/utils');
const lolex = require('lolex');
const tap = require('tap');

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
    t.true(utils.expired());
    t.end();
});

tap.test('utils.expired() - "expires" is Infinity - should return false', (t) => {
    const expires = Infinity;
    t.false(utils.expired(expires));
    t.end();
});

tap.test('utils.expired() - "expires" is behind Date.now() - should return true', (t) => {
    const expires = Date.now() - 100000;
    t.true(utils.expired(expires));
    t.end();
});

tap.test('utils.expired() - "expires" is in front of Date.now() - should return false', (t) => {
    const expires = Date.now() + 100000;
    t.false(utils.expired(expires));
    t.end();
});

/**
 * .isEmpty()
 */

tap.test('utils.isEmpty() - value is not empty - should return false', (t) => {
    t.false(utils.isEmpty('foo'));
    t.false(utils.isEmpty(1));
    t.false(utils.isEmpty({}));
    t.false(utils.isEmpty([1]));
    t.end();
});

tap.test('utils.isEmpty() - value is "null" - should return true', (t) => {
    t.true(utils.isEmpty(null));
    t.end();
});

tap.test('utils.isEmpty() - value is "undefined" - should return true', (t) => {
    t.true(utils.isEmpty(undefined));
    t.end();
});

/**
 * .isNotEmpty()
 */

tap.test('utils.isNotEmpty() - value is not empty - should return true', (t) => {
    t.true(utils.isNotEmpty('foo'));
    t.true(utils.isNotEmpty(1));
    t.true(utils.isNotEmpty({}));
    t.true(utils.isNotEmpty([1]));
    t.end();
});

tap.test('utils.isNotEmpty() - value is "null" - should return false', (t) => {
    t.false(utils.isNotEmpty(null));
    t.end();
});

tap.test('utils.isNotEmpty() - value is "undefined" - should return false', (t) => {
    t.false(utils.isNotEmpty(undefined));
    t.end();
});

/**
 * .isFunction()
 */

tap.test('utils.isFunction() - value is not a function - should return false', (t) => {
    t.false(utils.isFunction());
    t.false(utils.isFunction('foo'));
    t.false(utils.isFunction(1));
    t.false(utils.isFunction({}));
    t.false(utils.isFunction([1]));
    t.end();
});

tap.test('utils.isFunction() - value is a function - should return true', (t) => {
    t.true(utils.isFunction(function() {}));
    t.true(utils.isFunction(() => {}));
    t.end();
});
