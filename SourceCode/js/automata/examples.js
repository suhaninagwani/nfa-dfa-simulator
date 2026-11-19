/**
 * automata/examples.js — built-in example automata (also used by the test-suite).
 * Part of the ε-NFA → DFA Simulator core. Pure functions (no DOM), shared
 * through the global `Automata` namespace in the browser and via require() in Node.
 */
(function (root) {
  'use strict';
  const NS = (root.Automata = root.Automata || {});
  const EXAMPLES = {
    'ε-NFA: (a|b)*abb (textbook)': `// Classic Dragon-book ε-NFA for (a|b)*abb (Thompson construction)
states: 0 1 2 3 4 5 6 7 8 9 10
alphabet: a b
start: 0
final: 10
0 ε 1,7
1 ε 2,4
2 a 3
4 b 5
3 ε 6
5 ε 6
6 ε 1,7
7 a 8
8 b 9
9 b 10`,
    'NFA: strings ending in 01': `// Accepts binary strings that end in "01"
states: q0 q1 q2
alphabet: 0 1
start: q0
final: q2
q0 0 q0,q1
q0 1 q0
q1 1 q2`,
    'ε-NFA: a*b*': `// Accepts any number of a's followed by any number of b's
states: q0 q1
alphabet: a b
start: q0
final: q1
q0 a q0
q0 ε q1
q1 b q1`,
    'NFA: 3rd symbol from end is 1': `// Classic exponential blow-up example (DFA needs 8 states)
states: q0 q1 q2 q3
alphabet: 0 1
start: q0
final: q3
q0 0 q0
q0 1 q0,q1
q1 0 q2
q1 1 q2
q2 0 q3
q2 1 q3`,
    'ε-NFA: contains "ab" or "ba"': `// Union via ε-moves from a new start state
states: s p0 p1 p2 r0 r1 r2
alphabet: a b
start: s
final: p2 r2
s ε p0,r0
p0 a p0,p1
p0 b p0
p1 b p2
p2 a p2
p2 b p2
r0 a r0
r0 b r0,r1
r1 a r2
r2 a r2
r2 b r2`,
  };

  Object.assign(NS, { EXAMPLES });
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : globalThis);
