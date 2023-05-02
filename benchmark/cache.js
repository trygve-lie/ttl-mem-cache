'use strict';

const benchmark = require('benchmark');
const Cache = require('..');

const suite = new benchmark.Suite();

const add = (name, fn) => {
    suite.add(name, fn);
};



/**
 * .set()
 */

const cache1 = new Cache();
let cache1Counter = 0;

add('cache().set()', () => {
    const i = cache1Counter++;
    cache1.set(i, 'value');
});

const cache2 = new Cache();
let cache2Counter = 0;

add('cache().set(maxAge)', () => {
    const i = cache2Counter++;
    cache2.set(i, 'value', 3600000);
});



/**
 * .get()
 */

const cache3 = new Cache();
let cache3Counter = 0;

for (let i = 0; i < 10000; i++) {
    cache3.set(i, `value${i}`);
}

add('cache().get()', () => {
    const i = cache3Counter++ % 10000;
    cache3.get(i);
});



/**
 * .entries()
 */

const cache4 = new Cache();

for (let i = 0; i < 10000; i++) {
    cache4.set(i, 'value');
}

add('cache().entries()', () => {
    cache4.entries();
});


const cache5 = new Cache();

for (let i = 0; i < 10000; i++) {
    cache5.set(i, 'value');
}

add('cache().entries(() => {})', () => {
    cache5.entries((item) => {
        return item;
    });
});



/**
 * .prune()
 */

const cache6 = new Cache();

for (let i = 0; i < 10000; i++) {
    cache6.set(i, 'value');
}

add('cache().prune()', () => {
    cache6.prune();
});



suite
    .on('cycle', (event) => {
        console.log(event.target.toString());
        if (event.target.error) {
            console.error(event.target.error);
        }
    })
    .run();
