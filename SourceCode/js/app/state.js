/**
 * app/state.js — shared UI state, helpers and a tiny event bus.
 *
 * Every UI panel lives in its own module (input, steps, result, trace,
 * validation). Modules never call each other directly; they subscribe to
 * events so each one can be added (or removed) independently:
 *
 *   'init'      — page loaded; wire up DOM listeners
 *   'converted' — a valid NFA was parsed (and converted, if subset.js is loaded)
 *   'reset'     — input cleared or invalid; panels should empty themselves
 */
(function () {
  'use strict';

  const listeners = {};

  const App = {
    /** Current simulator state. */
    s: { nfa: null, dfa: null, steps: [], labels: {}, stepIdx: 0 },

    /** Subscribe to an event. */
    on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); },

    /** Fire an event; one failing panel must not break the others. */
    emit(evt, ...args) {
      (listeners[evt] || []).forEach(fn => {
        try { fn(...args); } catch (e) { console.error(`[App] ${evt} handler failed:`, e); }
      });
    },

    /** The core logic namespace. */
    A: window.Automata,

    $: id => document.getElementById(id),

    /** HTML-escape user-controlled text before inserting it with innerHTML. */
    esc: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),

    /** Display the empty string as ε. */
    showStr: s => (s === '' ? 'ε' : s),

    /** Build an error / note / OK message box. */
    message(kind, items) {
      if (!items.length) return '';
      const title = kind === 'error' ? 'Error' : kind === 'warn' ? 'Note' : 'OK';
      return `<div class="msg ${kind}"><b>${title}:</b><ul>${items.map(i => `<li>${App.esc(i)}</li>`).join('')}</ul></div>`;
    },

    /** Graph model of the current NFA for Render.draw(). */
    nfaGraph() {
      const nfa = App.s.nfa;
      return {
        nodes: nfa.states.map(s => ({ id: s, label: s, isStart: s === nfa.start, isFinal: nfa.finals.includes(s) })),
        edges: nfa.states.flatMap(s => Object.entries(nfa.delta[s]).flatMap(([sym, ts]) => ts.map(t => ({ from: s, to: t, label: sym })))),
      };
    },
  };

  window.App = App;
})();
