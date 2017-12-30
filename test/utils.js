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
    t.equal(utils.expired(), true);
    t.end();
});

tap.test('utils.expired() - "expires" is Infinity - should return false', (t) => {
    const expires = Infinity;
    t.equal(utils.expired(expires), false);
    t.end();
});

tap.test('utils.expired() - "expires" is behind Date.now() - should return true', (t) => {
    const expires = Date.now() - 100000;
    t.equal(utils.expired(expires), true);
    t.end();
});

tap.test('utils.expired() - "expires" is in front of Date.now() - should return false', (t) => {
    const expires = Date.now() + 100000;
    t.equal(utils.expired(expires), false);
    t.end();
});
