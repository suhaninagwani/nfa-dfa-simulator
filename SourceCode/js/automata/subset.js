/**
 * automata/subset.js — subset (powerset) construction with a step log for visualisation.
 * Part of the ε-NFA → DFA Simulator core. Pure functions (no DOM), shared
 * through the global `Automata` namespace in the browser and via require() in Node.
 */
(function (root) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) require('./closure.js');
  const NS = (root.Automata = root.Automata || {});
  const { DEAD, sortStates, setName, epsilonClosure, move } = NS;

  /**
   * Subset (powerset) construction: convert an ε-NFA into an equivalent DFA.
   *
   * Algorithm
   *   D0 = ε-closure({q0}); mark D0 unprocessed.
   *   while there is an unprocessed DFA state T:
   *       for each symbol a in Σ:
   *           U = ε-closure(move(T, a))
   *           if U is new, add it as an unprocessed DFA state
   *           Dtran[T, a] = U
   *   A DFA state is accepting iff it contains at least one NFA final state.
   *
   * Only reachable subsets are generated (at most 2^n). If some move yields
   * the empty set, the dead state ∅ is added explicitly (with self-loops on
   * every symbol) so the resulting DFA is COMPLETE — we never silently assume
   * a trap state.
   *
   * @param {object} nfa
   * @returns {{dfa: object, steps: object[]}}
   *   dfa   — { states, alphabet, start, finals, delta, sets }
   *           delta[name][symbol] = name ; sets[name] = string[] of NFA states
   *   steps — ordered log of every computation for step-by-step display.
   */
  function subsetConstruction(nfa) {
    const steps = [];
    const startClosure = epsilonClosure(nfa, [nfa.start]);
    const startName = setName(nfa, startClosure);
    steps.push({
      type: 'start',
      text: `Start: ε-closure({${nfa.start}}) = ${startName}`,
      dfaState: startName,
    });

    const sets = { [startName]: sortStates(nfa, startClosure) };
    const order = [startName];
    const delta = {};
    const queue = [startName];
    let processed = 0;

    while (queue.length) {
      const T = queue.shift();
      processed++;
      delta[T] = {};
      const Tset = new Set(sets[T]);
      steps.push({ type: 'process', text: `Processing DFA state ${T}`, dfaState: T });

      nfa.alphabet.forEach(a => {
        const moved = move(nfa, Tset, a);
        const U = epsilonClosure(nfa, moved);
        const Uname = setName(nfa, U);
        const isNew = !(Uname in sets);
        if (isNew) {
          sets[Uname] = sortStates(nfa, U);
          order.push(Uname);
          if (Uname !== DEAD) queue.push(Uname);
        }
        delta[T][a] = Uname;
        steps.push({
          type: 'transition',
          dfaState: T,
          symbol: a,
          move: setName(nfa, moved),
          closure: Uname,
          isNew,
          text: `δ(${T}, ${a}): move = ${setName(nfa, moved)}, ε-closure = ${Uname}${isNew ? '  ← NEW state' : ''}`,
        });
      });
    }

    // Complete the DFA with an explicit dead state if it was produced.
    if (DEAD in sets) {
      delta[DEAD] = {};
      nfa.alphabet.forEach(a => { delta[DEAD][a] = DEAD; });
      steps.push({ type: 'dead', dfaState: DEAD, text: `Dead state ∅ added with self-loops on every symbol (DFA is now complete).` });
    }

    const nfaFinals = new Set(nfa.finals);
    const finals = order.filter(n => sets[n].some(s => nfaFinals.has(s)));
    steps.push({
      type: 'finals',
      text: `Accepting DFA states (contain an NFA final state): ${finals.length ? finals.join(', ') : 'none'}`,
    });
    steps.push({ type: 'done', text: `Done: ${order.length} DFA state(s) from ${nfa.states.length} NFA state(s).` });

    return {
      dfa: { states: order, alphabet: [...nfa.alphabet], start: startName, finals, delta, sets },
      steps,
    };
  }

  Object.assign(NS, { subsetConstruction });
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : globalThis);
