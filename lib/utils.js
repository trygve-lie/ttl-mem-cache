'use strict';

module.exports.calculateExpire = (ttl = 0) => {
    if (ttl === Infinity) {
        return ttl;
    }
    return Date.now() + ttl;
};

module.exports.expired = (expires = 0, now = Date.now()) => {
    if (expires === Infinity) {
        return false;
    }
    return expires < now;
};

module.exports.isEmpty = (value) => {
    return (value === null || value === undefined);
};

module.exports.isNotEmpty = (value) => {
    return !this.isEmpty(value);
};

module.exports.isFunction = (value) => {
    return ({}.toString.call(value) === '[object Function]');
};
