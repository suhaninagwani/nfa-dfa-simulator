/**
 * automata/validate.js — validation: exhaustive NFA/DFA equivalence check and table export.
 * Part of the ε-NFA → DFA Simulator core. Pure functions (no DOM), shared
 * through the global `Automata` namespace in the browser and via require() in Node.
 */
(function (root) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) require('./simulate.js');
  const NS = (root.Automata = root.Automata || {});
  const { simulateNFA, simulateDFA } = NS;

  /** Every string over the alphabet with length 0..maxLen (in length-lexicographic order). */
  function allStrings(alphabet, maxLen) {
    const out = [''];
    let layer = [''];
    for (let len = 1; len <= maxLen; len++) {
      const next = [];
      layer.forEach(p => alphabet.forEach(a => next.push(p + a)));
      out.push(...next);
      layer = next;
    }
    return out;
  }

  /**
   * Validation: check NFA and DFA agree on every string up to maxLen.
   * The total string count is capped to keep the UI responsive.
   * @returns {{tested:number, mismatches:{input:string,nfa:boolean,dfa:boolean}[], maxLen:number}}
   */
  function checkEquivalence(nfa, dfa, maxLen = 6, cap = 20000) {
    // reduce maxLen until the number of strings fits the cap
    let L = maxLen;
    const k = nfa.alphabet.length;
    const count = n => (k === 1 ? n + 1 : (Math.pow(k, n + 1) - 1) / (k - 1));
    while (L > 0 && count(L) > cap) L--;
    const strings = allStrings(nfa.alphabet, L);
    const mismatches = [];
    strings.forEach(s => {
      const a = simulateNFA(nfa, s).accepted;
      const b = simulateDFA(dfa, s).accepted;
      if (a !== b) mismatches.push({ input: s, nfa: a, dfa: b });
    });
    return { tested: strings.length, mismatches, maxLen: L };
  }

  /** Render a DFA's transition table as rows for display/tests. */
  function dfaTable(dfa) {
    return dfa.states.map(s => ({
      state: s,
      isStart: s === dfa.start,
      isFinal: dfa.finals.includes(s),
      next: dfa.alphabet.map(a => dfa.delta[s][a]),
    }));
  }

  Object.assign(NS, { allStrings, checkEquivalence, dfaTable });
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : globalThis);
