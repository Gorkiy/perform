import { uuid } from './config.js';

let counter = new Counter();

counter.init(uuid, String(Math.random()).substr(2, 12), 'index.html');
counter.setAdditionalParams({
    env: 'production',
    platform: 'touch'
});

counter.send('connect', performance.timing.connectEnd - performance.timing.connectStart);
counter.send('ttfb', performance.timing.responseEnd - performance.timing.requestStart);

let timeStart = Date.now();

setTimeout(function () {
    const loader = document.querySelector('.cat');
    const container = document.querySelector('.box');

    loader.classList.add('visually-hidden');
    counter.send('loaded', Date.now() - timeStart);

    const image = document.createElement('IMG');
    image.src = "./images/cat.jpg";
    image.classList.add('result');
    image.onload = () => counter.send('result', Date.now() - timeStart);
    container.append(image);
}, Math.random() * 1000 + 500);