/**
 * NFA / DFA string simulation tests (automata/simulate.js).
 * Run all tests:  npm test   (Node.js 18+, no dependencies)
 * Test IDs match the "Testing & verification" table in the project report.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
require('../SourceCode/js/automata/closure.js');
require('../SourceCode/js/automata/parser.js');
require('../SourceCode/js/automata/examples.js');
require('../SourceCode/js/automata/subset.js');
require('../SourceCode/js/automata/simulate.js');
const A = globalThis.Automata;

const build = text => {
  const r = A.parseNFA(text);
  assert.deepEqual(r.errors, [], 'definition should parse without errors');
  return { nfa: r.nfa, ...A.subsetConstruction(r.nfa) };
};
const accepts = (m, s) => A.simulateDFA(m.dfa, s).accepted;

test('T01 DFA simulation: accepted string (ending in 01: "101")', () => {
  const m = build(A.EXAMPLES['NFA: strings ending in 01']);
  assert.equal(accepts(m, '101'), true);
});

test('T02 DFA simulation: rejected string (ending in 01: "110")', () => {
  const m = build(A.EXAMPLES['NFA: strings ending in 01']);
  assert.equal(accepts(m, '110'), false);
});

test('T03 Unknown symbol in input string → validation error', () => {
  const m = build(A.EXAMPLES['NFA: strings ending in 01']);
  const r = A.simulateDFA(m.dfa, '01x');
  assert.match(r.error, /not in the alphabet/);
  assert.match(A.simulateNFA(m.nfa, '2').error, /not in the alphabet/);
});

test('T04 Empty string ε: result decided by ε-closure of start state', () => {
  const ab = build(A.EXAMPLES['ε-NFA: a*b*']);          // q1 final, reachable by ε
  assert.equal(accepts(ab, ''), true);
  assert.equal(A.simulateNFA(ab.nfa, '').accepted, true);
  const end01 = build(A.EXAMPLES['NFA: strings ending in 01']);
  assert.equal(accepts(end01, ''), false);
});

test('T11 Edge: no final states → empty language', () => {
  const r = A.parseNFA('states: q0\nalphabet: a\nstart: q0\nq0 a q0');
  assert.ok(r.warnings.some(w => /empty language/.test(w)));
  const { dfa } = A.subsetConstruction(r.nfa);
  assert.deepEqual(dfa.finals, []);
  assert.equal(A.simulateDFA(dfa, 'aaa').accepted, false);
});

test('T09 Dead state ∅ is added explicitly and the DFA is complete', () => {
  const { dfa } = build(A.EXAMPLES['ε-NFA: a*b*']);
  assert.ok(dfa.states.includes(A.DEAD));
  assert.deepEqual(dfa.delta[A.DEAD], { a: A.DEAD, b: A.DEAD });
  dfa.states.forEach(s => dfa.alphabet.forEach(a => assert.ok(dfa.delta[s][a] !== undefined)));
  assert.equal(accepts({ dfa }, 'ba'), false); // falls into ∅
});

test('T12 Edge: single state with no transitions, start = final', () => {
  const m = build('states: q0\nalphabet: a\nstart: q0\nfinal: q0');
  assert.equal(accepts(m, ''), true);
  assert.equal(accepts(m, 'a'), false);
  assert.deepEqual(m.dfa.states, ['{q0}', A.DEAD]);
});

test('T13 Edge: ε-cycle (q0 ε q1, q1 ε q0) terminates', () => {
  const m = build('states: q0 q1 q2\nalphabet: a\nstart: q0\nfinal: q2\nq0 ε q1\nq1 ε q0\nq1 a q2');
  assert.deepEqual([...A.epsilonClosure(m.nfa, ['q0'])].sort(), ['q0', 'q1']);
  assert.equal(accepts(m, 'a'), true);
});

test('T15 Edge: ε aliases (eps, #, epsilon) are all treated as ε', () => {
  ['eps', '#', 'epsilon', 'ε'].forEach(alias => {
    const m = build(`states: p q\nalphabet: a\nstart: p\nfinal: q\np ${alias} q`);
    assert.equal(accepts(m, ''), true, alias);
  });
});
