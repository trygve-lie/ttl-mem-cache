'use strict';

const os = require('os');
const utils = require('./utils');

const _key = Symbol('_key');
const _value = Symbol('_value');
const _ttl = Symbol('_ttl');
const _origin = Symbol('_origin');
const _expires = Symbol('_expires');

const TtlMemCacheEntry = class TtlMemCacheEntry {
    constructor({
        key, value = null, ttl = -1, origin = null, expires
    } = {}) {
        this[_key] = key;
        this[_value] = value;
        this[_ttl] = ttl;
        this[_origin] = origin;
        this[_expires] = expires || utils.calculateExpire(this.ttl);
    }

    /**
     * Meta
     */

    get [Symbol.toStringTag]() {
        return 'TtlMemCacheEntry';
    }

    [Symbol.toPrimitive](hint) {
        if (hint === 'string') return `${JSON.stringify(this)}${os.EOL}`;
        return Object.prototype.toString.call(this);
    }

    /**
     * Public keys
     */

    get key() {
        return this[_key];
    }

    set key(val) {
        throw new Error('Cannot set read-only property.');
    }

    get value() {
        return this[_value];
    }

    set value(val) {
        throw new Error('Cannot set read-only property.');
    }

    get ttl() {
        return this[_ttl];
    }

    set ttl(val) {
        throw new Error('Cannot set read-only property.');
    }

    get origin() {
        return this[_origin];
    }

    set origin(val) {
        throw new Error('Cannot set read-only property.');
    }

    get expires() {
        return this[_expires];
    }

    set expires(val) {
        throw new Error('Cannot set read-only property.');
    }

    /**
     * Public methods
     */

    expired(now) {
        return utils.expired(this.expires, now);
    }

    toJSON() {
        return {
            key: this.key,
            value: this.value,
            ttl: this.ttl,
            origin: this.origin,
            expires: this.expires,
            type: 'TtlMemCacheEntry',
        };
    }

    /**
     * Static methods
     */

    static assertLoose(obj = {}) {
        if (utils.isNotEmpty(obj.key) && utils.isNotEmpty(obj.value)) {
            return true;
        }
        return false;
    }

    static assertStrict(obj = {}) {
        if (utils.isNotEmpty(obj.key) && utils.isNotEmpty(obj.value) && utils.isNotEmpty(obj.ttl)) {
            return true;
        }
        return false;
    }
};

module.exports = TtlMemCacheEntry;
