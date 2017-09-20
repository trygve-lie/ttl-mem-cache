'use strict';

const stream = require('readable-stream');

module.exports = class Cache extends stream.Duplex {
    constructor({ maxAge = 5 * 60 * 1000, stale = false } = {}) {
        super({
            objectMode: true
        });
        this.maxAge = maxAge;
        this.stale = stale;
        this.store = new Map();

        this.on('set', (obj) => {
            this.push(obj);
        });
    }

    get(key) {
        const item = this.store.get(key);
        if (item) {
            if (this.constructor._validate(item)) {
                return item.value;
            }

            this.del(key);

            if (this.stale) {
                return item.value;
            }
        }
        return undefined;
    }

    set(key, value, maxAge) {
        if (key === null || key === undefined) {
            throw new Error('Argument "key" cannot be null or undefined');
        }
        if (value === null || value === undefined) {
            throw new Error('Argument "value" cannot be null or undefined');
        }

        const expires = Date.now() + (maxAge || this.maxAge);
        this.store.set(key, { value, expires });
        this.emit('set', { key, value });
        return value;
    }

    del(key) {
        const success = this.store.delete(key);
        this.emit('dispose', key);
        return success;
    }

    entries(mutator) {
        const mutate = (typeof mutator === 'function');
        const now = Date.now();
        const arr = [];

        this.store.forEach((item, key) => {
            if (this.constructor._validate(item, now)) {
                if (mutate) {
                    arr.push(mutator(item.value));
                } else {
                    arr.push(item.value);
                }
            } else {
                if (this.stale) {
                    if (mutate) {
                        arr.push(mutator(item.value));
                    } else {
                        arr.push(item.value);
                    }
                }
                this.del(key);
            }
        });

        return arr;
    }

    prune() {
        const now = Date.now();
        this.store.forEach((item, key) => {
            if (!this.constructor._validate(item, now)) {
                this.del(key);
            }
        });
    }

    clear() {
        this.store.clear();
        this.emit('clear');
    }

    _write(obj, enc, next) {
        if (obj.key && obj.value) {
            this.set(obj.key, obj.value);
            return next();
        }

        if (obj.key && (obj.value === null || obj.value === undefined)) {
            this.del(obj.key);
            return next();
        }

        this.emit('error', new Error('Object does not contain a "key" property or the value for "key" is null or undefined'));
        return next();
    }

    _read() {
        // "push" happens on "set" event in constructor
    }

    static _validate(item = { expires: 0 }, now = Date.now()) {
        return (item.expires > now);
    }
};
