'use strict';

const stream = require('readable-stream');



module.exports = class Cache extends stream.Duplex {
    constructor({ maxAge = 5 * 60 * 1000 } = {}) {
        super({
            objectMode: true
        });
        this.maxAge = maxAge;
        this.store = new Map();

        this.on('set', (obj) => {
            this.push(obj);
        });
    }

    get(key) {
        const item = this.store.get(key);
        if (item === undefined) {
            return item;
        }
        if (this.constructor._validate(item)) {
            return item.value;
        }
        return this.del(key);
    }

    set(key, value, maxAge) {
        if (key === null || key === undefined) {
            throw new Error('Argument "key" cannot be null or undefined');
        }
        if (value === null || value === undefined) {
            throw new Error('Argument "value" cannot be null or undefined');
        }

        if (this.store.has(key)) {
            return value;
        }

        const expires = Date.now() + (maxAge ? maxAge : this.maxAge);
        this.store.set(key, { value, expires });
        this.emit('set', { key, value });
        return value;
    }

    del(key) {
        const item = this.store.delete(key);
        this.emit('dispose', key);
        return undefined;
    }

    entries(mutator) {
        const mutate = (typeof mutator === 'function');
        const now = Date.now();
        const arr = [];

        this.store.forEach((item, key) => {
            if (this.constructor._validate(item, now)) {
                if (mutate) {
                    arr.push(mutator({
                        key: key,
                        value: item.value
                    }));
                } else {
                    arr.push({
                        key: key,
                        value: item.value
                    });
                }
            } else {
                this.del(key);
            }
        });

        return arr;
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
        next();

    }

    _read(size) {
        // "push" happens on "set" event in constructor
    }

    static _validate(item = {expires: 0}, now = Date.now()) {
        return (item.expires > now);
    }
};
