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
