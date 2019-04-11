'use strict';

/* eslint prefer-rest-params: "off" */

const stream = require('readable-stream');
const crypto = require('crypto');
const utils = require('./utils');
const Entry = require('./entry');

const _set = Symbol('_set');
const _del = Symbol('_del');

const TtlMemCache = class TtlMemCache extends stream.Duplex {
    constructor({
        ttl = 5 * 60 * 1000, stale = false, changefeed = false, id = undefined,
    } = {}) {
        super(Object.assign({
            objectMode: true
        }, ...arguments));

        Object.defineProperty(this, 'ttl', {
            value: ttl,
            enumerable: true,
        });

        Object.defineProperty(this, 'stale', {
            value: stale,
            enumerable: true,
        });

        Object.defineProperty(this, 'changefeed', {
            value: changefeed,
            enumerable: true,
        });

        Object.defineProperty(this, 'store', {
            value: new Map(),
        });

        Object.defineProperty(this, 'id', {
            value: id || crypto.randomBytes(3 * 4).toString('base64'),
            enumerable: true,
        });

        this.on('broadcast', (entry) => {
            if (this.readableFlowing) {
                if (this._readableState.objectMode) {
                    this.push(entry);
                } else {
                    this.push(Buffer.from(entry));
                }
            }
        });

        // Avoid hitting the max listeners limit when multiple
        // streams is piped into the same stream.
        this.on('pipe', () => {
            this.setMaxListeners(this.getMaxListeners() + 1);
        });

        this.on('unpipe', () => {
            this.setMaxListeners(this.getMaxListeners() - 1);
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

    [_set]({
        key, value, ttl = this.ttl, origin = this.id, expires
    }) {
        if (utils.isEmpty(key)) {
            throw new Error('Argument "key" cannot be null or undefined');
        }
        if (utils.isEmpty(value)) {
            throw new Error('Argument "value" cannot be null or undefined');
        }

        let item = value;
        if (this.changefeed) {
            item = {
                oldVal: this.get(key),
                newVal: value
            };
        }

        const entry = new Entry({
            key, value, ttl, origin, expires
        });

        this.store.set(key, entry);

        this.emit('broadcast', entry);
        this.emit('set', key, item);

        return value;
    }

    [_del]({ key }) {
        const item = this.store.get(key);
        const success = this.store.delete(key);
        if (utils.isNotEmpty(item)) {
            this.emit('broadcast', new Entry({ key }));
            this.emit('dispose', key, item.value);
        }
        return success;
    }

    /**
     * Public methods
     */

    get(key) {
        const item = this.store.get(key);
        if (utils.isNotEmpty(item)) {
            const expired = item.expired();

            if (expired) {
                this.del(key);
            }

            if (expired && this.stale) {
                return item.value;
            }

            if (expired) {
                return null;
            }

            return item.value;
        }
        return null;
    }

    set(key, value, ttl) {
        return this[_set]({ key, value, ttl });
    }

    del(key) {
        return this[_del]({ key });
    }

    entries(mutator) {
        const mutate = utils.isFunction(mutator);
        const now = Date.now();
        const arr = [];

        this.store.forEach((item, key) => {
            if (item.expired(now)) {
                if (this.stale) {
                    if (mutate) {
                        arr.push(mutator(item.value));
                    } else {
                        arr.push(item.value);
                    }
                }
                this.del(key);
            } else if (mutate) {
                arr.push(mutator(item.value));
            } else {
                arr.push(item.value);
            }
        });

        return arr;
    }

    prune() {
        const now = Date.now();
        this.store.forEach((item, key) => {
            if (item.expired(now)) {
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
            if (Entry.assertStrict(item[1])) {
                const entry = new Entry(item[1]);
                this.store.set(entry.key, entry);
                return entry.key;
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

    _write(chunk, enc, next) {
        let obj = {};
        if (this._writableState.objectMode) {
            obj = chunk;
        } else {
            try {
                const str = chunk.toString();
                obj = JSON.parse(str);
            } catch (error) {
                this.emit('error', error);
                return next();
            }
        }

        if (Entry.assertLoose(obj)) {
            const item = this.store.get(obj.key);
            if (
                utils.isNotEmpty(item)
                && obj.key === item.key
                && obj.expires === item.expires
            ) {
                return next();
            }

            this[_set](obj);
            return next();
        }

        if (utils.isNotEmpty(obj.key) && utils.isEmpty(obj.value)) {
            this[_del](obj);
            return next();
        }

        this.emit('error', new Error('Object does not contain a "key" property or the value for "key" is null or undefined'));
        return next();
    }

    _read() {
        // "push" happens on "set" event in constructor
    }
};

module.exports = TtlMemCache;
