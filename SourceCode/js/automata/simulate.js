/**
 * automata/simulate.js — running input strings on the ε-NFA and on the DFA.
 * Part of the ε-NFA → DFA Simulator core. Pure functions (no DOM), shared
 * through the global `Automata` namespace in the browser and via require() in Node.
 */
(function (root) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) require('./closure.js');
  const NS = (root.Automata = root.Automata || {});
  const { sortStates, epsilonClosure, move } = NS;

  /** Validate an input string against the alphabet. Returns an error string or null. */
  function validateInput(alphabet, input) {
    for (const ch of input) {
      if (!alphabet.includes(ch)) return `Symbol "${ch}" is not in the alphabet {${alphabet.join(', ')}}.`;
    }
    return null;
  }

  /**
   * Simulate the ε-NFA on an input string by tracking the set of active states.
   * The empty string ε is accepted iff ε-closure({q0}) contains a final state.
   * @returns {{accepted:boolean, trace:{symbol:string|null, states:string[]}[], error:string|null}}
   */
  function simulateNFA(nfa, input) {
    const error = validateInput(nfa.alphabet, input);
    if (error) return { accepted: false, trace: [], error };
    let current = epsilonClosure(nfa, [nfa.start]);
    const trace = [{ symbol: null, states: sortStates(nfa, current) }];
    for (const ch of input) {
      current = epsilonClosure(nfa, move(nfa, current, ch));
      trace.push({ symbol: ch, states: sortStates(nfa, current) });
    }
    const finals = new Set(nfa.finals);
    return { accepted: [...current].some(s => finals.has(s)), trace, error: null };
  }

  /**
   * Simulate a (complete) DFA. A missing transition is reported as an error
   * instead of silently assuming a trap state.
   * @returns {{accepted:boolean, trace:{symbol:string|null, state:string}[], error:string|null}}
   */
  function simulateDFA(dfa, input) {
    const error = validateInput(dfa.alphabet, input);
    if (error) return { accepted: false, trace: [], error };
    let current = dfa.start;
    const trace = [{ symbol: null, state: current }];
    for (const ch of input) {
      const next = (dfa.delta[current] || {})[ch];
      if (next === undefined) return { accepted: false, trace, error: `Missing DFA transition δ(${current}, ${ch}).` };
      current = next;
      trace.push({ symbol: ch, state: current });
    }
    return { accepted: dfa.finals.includes(current), trace, error: null };
  }

  Object.assign(NS, { validateInput, simulateNFA, simulateDFA });
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : globalThis);
