'use strict';

module.exports.calculateExpire = (maxAge = 0) => {
    if (maxAge === Infinity) {
        return maxAge;
    }
    return Date.now() + maxAge;
};

module.exports.validate = (item = { expires: 0 }, now = Date.now()) => {
    if (item.expires === Infinity) {
        return false;
    }
    return (item.expires > now);
};
