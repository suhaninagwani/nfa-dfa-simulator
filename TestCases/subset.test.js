/**
 * Subset construction tests (automata/subset.js).
 * Run all tests:  npm test   (Node.js 18+, no dependencies)
 * Test IDs match the "Testing & verification" table in the project report.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
require('../SourceCode/js/automata/closure.js');
require('../SourceCode/js/automata/parser.js');
require('../SourceCode/js/automata/examples.js');
require('../SourceCode/js/automata/subset.js');
const A = globalThis.Automata;

const build = text => {
  const r = A.parseNFA(text);
  assert.deepEqual(r.errors, [], 'definition should parse without errors');
  return { nfa: r.nfa, ...A.subsetConstruction(r.nfa) };
};

test('T07 Textbook (a|b)*abb → exactly 5 DFA states A–E (Aho et al., Fig 3.35)', () => {
  const { dfa } = build(A.EXAMPLES['ε-NFA: (a|b)*abb (textbook)']);
  assert.deepEqual(dfa.states, ['{0,1,2,4,7}', '{1,2,3,4,6,7,8}', '{1,2,4,5,6,7}', '{1,2,4,5,6,7,9}', '{1,2,4,5,6,7,10}']);
  assert.deepEqual(dfa.finals, ['{1,2,4,5,6,7,10}']);
  const [Aa, B, C, D, E] = dfa.states;
  const expected = { [Aa]: [B, C], [B]: [B, D], [C]: [B, C], [D]: [B, E], [E]: [B, C] };
  Object.entries(expected).forEach(([s, [onA, onB]]) => {
    assert.equal(dfa.delta[s].a, onA);
    assert.equal(dfa.delta[s].b, onB);
  });
});

test('T08 Exponential case: "3rd symbol from end is 1" needs 2^3 = 8 DFA states', () => {
  const { dfa } = build(A.EXAMPLES['NFA: 3rd symbol from end is 1']);
  assert.equal(dfa.states.length, 8);
});

test('T14 Edge: unreachable states produce a warning and are absent from the DFA', () => {
  const r = A.parseNFA('states: q0 q1 qx\nalphabet: a\nstart: q0\nfinal: q1\nq0 a q1\nqx a q1');
  assert.ok(r.warnings.some(w => /Unreachable.*qx/.test(w)));
  const { dfa } = A.subsetConstruction(r.nfa);
  assert.ok(dfa.states.every(s => !s.includes('qx')));
});

test('T16 Step log: starts with ε-closure, records one step per DFA transition, ends with done', () => {
  const { dfa, steps } = build(A.EXAMPLES['ε-NFA: (a|b)*abb (textbook)']);
  assert.equal(steps[0].type, 'start');
  assert.equal(steps[steps.length - 1].type, 'done');
  const transitions = steps.filter(s => s.type === 'transition');
  assert.equal(transitions.length, dfa.states.length * dfa.alphabet.length); // 5 × 2 = 10
  assert.equal(transitions.filter(s => s.isNew).length, dfa.states.length - 1); // every non-start state discovered once
});

test('T17 "Ending in 01" NFA → exact 3-state DFA table', () => {
  const { dfa } = build(A.EXAMPLES['NFA: strings ending in 01']);
  assert.deepEqual(dfa.states, ['{q0}', '{q0,q1}', '{q0,q2}']);
  assert.deepEqual(dfa.delta['{q0}'], { 0: '{q0,q1}', 1: '{q0}' });
  assert.deepEqual(dfa.delta['{q0,q1}'], { 0: '{q0,q1}', 1: '{q0,q2}' });
  assert.deepEqual(dfa.delta['{q0,q2}'], { 0: '{q0,q1}', 1: '{q0}' });
  assert.deepEqual(dfa.finals, ['{q0,q2}']);
});
