'use strict';

const benchmark = require('benchmark');
const Cache = require('../');

const suite = new benchmark.Suite();

const add = (name, fn) => {
    suite.add(name, fn);
};



/**
 * .set()
 */

const cache1 = new Cache();
let cache1Counter = 0;

add('.set()', () => {
    cache1.set(`key${cache1Counter++}`, 'value');
});

add('.set(maxAge)', () => {
    cache1.set(`key${cache1Counter++}`, 'value', 3600000);
});



/**
 * .get()
 */

const cache2 = new Cache();
let cache2Counter = 0;

for (let i = 0; i < 10000; i++) {
    cache2.set(`key${i}`, 'value');
}

add('.get()', () => {
    cache2.get(`key${(cache2Counter++) % 10000}`);
});



/**
 * .entries()
 */

const cache3 = new Cache();

for (let i = 0; i < 10000; i++) {
    cache3.set(`key${i}`, 'value');
}

add('.entries()', () => {
    cache3.entries();
});


const cache4 = new Cache();

for (let i = 0; i < 10000; i++) {
    cache4.set(`key${i}`, 'value');
}

add('.entries(() => {})', () => {
    cache4.entries((item) => {
        return item.value;
    });
});



suite
    .on('cycle', (event) => {
        console.log(event.target.toString());
        if (event.target.error) {
            console.error(event.target.error);
        }
    })
    .run();
