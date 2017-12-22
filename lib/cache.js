'use strict';

const stream = require('stream');
const crypto = require('crypto');

const _set = Symbol('_set');
const _del = Symbol('_del');

const TtlMemCache = class TtlMemCache extends stream.Duplex {
    constructor({
        maxAge = 5 * 60 * 1000, stale = false, changefeed = false, id = undefined
    } = {}) {
        super({
            objectMode: true
        });

        Object.defineProperty(this, 'maxAge', {
            value: maxAge,
        });

        Object.defineProperty(this, 'stale', {
            value: stale,
        });

        Object.defineProperty(this, 'changefeed', {
            value: changefeed,
        });

        Object.defineProperty(this, 'store', {
            value: new Map(),
        });

        Object.defineProperty(this, 'id', {
            value: id || crypto.randomBytes(3 * 4).toString('base64'),
        });

        this.on('broadcast', (obj, options) => {
            if (this._readableState.flowing) {
                const origin = options.origin ? options.origin : this.id;
                this.push({
                    key: obj.key,
                    value: obj.value,
                    origin,
                });
            }
        });
    }

    /**
     * Meta
     */

    get [Symbol.toStringTag]() {
        return 'TtlMemCache';
    }

    /**
     * Private methods
     */

    [_set](key, value, options = {}) {
        if (key === null || key === undefined) {
            throw new Error('Argument "key" cannot be null or undefined');
        }
        if (value === null || value === undefined) {
            throw new Error('Argument "value" cannot be null or undefined');
        }

        const expires = this.constructor._calculateExpire((options.maxAge || this.maxAge));

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
        this.emit('broadcast', eventObj, options);
        this.emit('set', eventObj);
        return value;
    }

    [_del](key, options = {}) {
        const item = this.store.get(key);
        const success = this.store.delete(key);
        if (item) {
            this.emit('broadcast', {
                key,
                value: null
            }, options);
            this.emit('dispose', key, item.value);
        }
        return success;
    }

    /**
     * Public methods
     */

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
        return this[_set](key, value, {
            maxAge
        });
    }

    del(key) {
        return this[_del](key);
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

    load(items) {
        if (!Array.isArray(items)) {
            throw new Error('Argument "items" is not an Array');
        }
        return items.map((item) => {
            if (item[0] && item[1] && item[1].value && item[1].expires) {
                this.store.set(item[0], item[1]);
                return item[0];
            }
            return undefined;
        }).filter(item => item);
    }

    length() {
        return this.store.size;
    }

    /**
     * Stream methods
     */

    _write(obj, enc, next) {
        const options = {
            origin: obj.origin ? obj.origin : this.id
        };

        if (obj.origin === this.id) {
            return next();
        }

        if (obj.key && obj.value) {
            this[_set](obj.key, obj.value, options);
            return next();
        }

        if (obj.key && (obj.value === null || obj.value === undefined)) {
            this[_del](obj.key, options);
            return next();
        }

        this.emit('error', new Error('Object does not contain a "key" property or the value for "key" is null or undefined'));
        return next();
    }

    _read() {
        // "push" happens on "set" event in constructor
    }

    /**
     * Static methods
     */

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

module.exports = TtlMemCache;
