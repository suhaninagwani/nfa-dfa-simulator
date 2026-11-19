/**
 * app/main.js — entry point. Loaded last: fires 'init' so every panel module
 * wires its listeners, then loads the first built-in example.
 */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    App.emit('init');
    const sel = App.$('example');
    if (sel && sel.value) App.loadExample(sel.value);
    else App.reset();
  });
})();
