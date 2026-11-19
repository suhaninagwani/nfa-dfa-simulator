/**
 * automata/closure.js — constants, canonical state-set naming, ε-closure and move.
 * Part of the ε-NFA → DFA Simulator core. Pure functions (no DOM), shared
 * through the global `Automata` namespace in the browser and via require() in Node.
 */
(function (root) {
  'use strict';
  const NS = (root.Automata = root.Automata || {});
  const EPS = 'ε';
  const EPS_ALIASES = new Set(['ε', 'eps', 'epsilon', 'e', '#', 'λ', 'lambda']);
  const DEAD = '∅';

  /** Return states in a stable order (order of declaration in the NFA). */
  function sortStates(nfa, set) {
    const order = new Map(nfa.states.map((s, i) => [s, i]));
    return [...set].sort((a, b) => order.get(a) - order.get(b));
  }

  /** Canonical DFA-state name for a set of NFA states. */
  function setName(nfa, set) {
    const arr = sortStates(nfa, set);
    return arr.length ? `{${arr.join(',')}}` : DEAD;
  }

  /**
   * ε-closure(T): every NFA state reachable from a state in T using only
   * ε-transitions (including the states of T themselves). Iterative DFS.
   *
   * @param {object} nfa
   * @param {Iterable<string>} states  the set T
   * @returns {Set<string>}
   */
  function epsilonClosure(nfa, states) {
    const closure = new Set(states);
    const stack = [...closure];
    while (stack.length) {
      const s = stack.pop();
      ((nfa.delta[s] || {})[EPS] || []).forEach(t => {
        if (!closure.has(t)) { closure.add(t); stack.push(t); }
      });
    }
    return closure;
  }

  /**
   * move(T, a): states reachable from some state in T on exactly one
   * a-transition (no ε moves applied).
   */
  function move(nfa, states, symbol) {
    const result = new Set();
    states.forEach(s => ((nfa.delta[s] || {})[symbol] || []).forEach(t => result.add(t)));
    return result;
  }

  Object.assign(NS, { EPS, EPS_ALIASES, DEAD, sortStates, setName, epsilonClosure, move });
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : globalThis);
