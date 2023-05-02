'use strict';

const calculateExpire = (ttl = 0) => {
    if (ttl === Infinity) {
        return ttl;
    }
    return Date.now() + ttl;
};
module.exports.calculateExpire = calculateExpire;

const expired = (expires = 0, now = Date.now()) => {
    if (expires === Infinity) {
        return false;
    }
    return expires < now;
};
module.exports.expired = expired;

const isEmpty = (value) => {
    return (value === null || value === undefined);
};
module.exports.isEmpty = isEmpty;

const isNotEmpty = (value) => {
    return !isEmpty(value);
};
module.exports.isNotEmpty = isNotEmpty;

const isFunction = (value) => {
    return ({}.toString.call(value) === '[object Function]');
};
module.exports.isFunction = isFunction;
