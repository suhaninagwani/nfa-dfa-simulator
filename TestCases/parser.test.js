/**
 * Parser, input validation and ε-closure tests (automata/parser.js, closure.js).
 * Run all tests:  npm test   (Node.js 18+, no dependencies)
 * Test IDs match the "Testing & verification" table in the project report.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
require('../SourceCode/js/automata/closure.js');
require('../SourceCode/js/automata/parser.js');
require('../SourceCode/js/automata/examples.js');
const A = globalThis.Automata;

test('T05 Malformed definitions are rejected with clear messages', () => {
  const cases = [
    ['states: q0\nalphabet: a\nfinal: q0', /start/i],                         // missing start
    ['states: q0\nalphabet: a\nstart: q9\nfinal: q0', /Start state "q9"/],     // unknown start
    ['states: q0\nalphabet: a\nstart: q0\nfinal: q0\nq0 b q0', /not in the alphabet/],
    ['states: q0\nalphabet: a\nstart: q0\nfinal: q0\nq0 a q5', /unknown target/],
    ['states: q0\nalphabet: a\nstart: q0\nfinal: q0\nq0 a', /could not understand/],
    ['states: q0\nalphabet: ab\nstart: q0\nfinal: q0', /single character/],
    ['states: q0\nalphabet: eps\nstart: q0\nfinal: q0', /reserved for epsilon/],
  ];
  cases.forEach(([text, re]) => {
    const r = A.parseNFA(text);
    assert.equal(r.nfa, null, text);
    assert.match(r.errors.join(' | '), re, text);
  });
});

// ---------------------------------------------------------------- algorithm correctness

test('T06 ε-closure follows chains of ε-moves (textbook example)', () => {
  const { nfa } = A.parseNFA(A.EXAMPLES['ε-NFA: (a|b)*abb (textbook)']);
  assert.deepEqual([...A.epsilonClosure(nfa, ['0'])].sort((a, b) => a - b), ['0', '1', '2', '4', '7']);
  assert.deepEqual([...A.epsilonClosure(nfa, ['5'])].sort((a, b) => a - b), ['1', '2', '4', '5', '6', '7']);
});

test('T18 serializeNFA → parseNFA round-trip gives the same automaton', () => {
  Object.values(A.EXAMPLES).forEach(text => {
    const first = A.parseNFA(text).nfa;
    const again = A.parseNFA(A.serializeNFA(first)).nfa;
    assert.deepEqual(again, first);
  });
});

test('T19 Duplicate states are merged with a warning; comments and blank lines ignored', () => {
  const r = A.parseNFA('// comment\n\nstates: q0 q0 q1\nalphabet: a\nstart: q0\nfinal: q1\nq0 a q1  // trailing comment');
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.nfa.states, ['q0', 'q1']);
  assert.ok(r.warnings.some(w => /more than once/.test(w)));
});
