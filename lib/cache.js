'use strict';

const stream = require('readable-stream');

module.exports = class Cache extends stream.Duplex {
    constructor({ maxAge = 5 * 60 * 1000, stale = false, changefeed = false } = {}) {
        super({
            objectMode: true
        });
        this.maxAge = maxAge;
        this.stale = stale;
        this.changefeed = changefeed;
        this.store = new Map();

        this.on('set', (obj) => {
            if (this._readableState.flowing) {
                this.push(obj);
            }
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
        return null;
    }

    set(key, value, maxAge) {
        if (key === null || key === undefined) {
            throw new Error('Argument "key" cannot be null or undefined');
        }
        if (value === null || value === undefined) {
            throw new Error('Argument "value" cannot be null or undefined');
        }

        const expires = this.constructor._calculateExpire((maxAge || this.maxAge));

        const eventObj = {
            key,
            value
        };

        if (this.changefeed) {
            eventObj.value = {
                oldVal: this.get(key),
                newVal: value
            };
        }

        this.store.set(key, { value, expires });
        this.emit('set', eventObj);
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

    dump() {
        return Array.from(this.store.entries());
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

    static _calculateExpire(maxAge = 0) {
        if (maxAge === Infinity) {
            return maxAge;
        }
        return Date.now() + maxAge;
    }

    static _validate(item = { expires: 0 }, now = Date.now()) {
        if (item.expires === Infinity) {
            return false;
        }
        return (item.expires > now);
    }
};
