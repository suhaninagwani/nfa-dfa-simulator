/**
 * Equivalence-check tests (automata/validate.js).
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
require('../SourceCode/js/automata/validate.js');
const A = globalThis.Automata;

const build = text => {
  const r = A.parseNFA(text);
  assert.deepEqual(r.errors, [], 'definition should parse without errors');
  return { nfa: r.nfa, ...A.subsetConstruction(r.nfa) };
};

test('T10 NFA and DFA agree on every string up to length 8 (all examples)', () => {
  Object.entries(A.EXAMPLES).forEach(([name, text]) => {
    const { nfa, dfa } = build(text);
    const r = A.checkEquivalence(nfa, dfa, 8);
    assert.equal(r.mismatches.length, 0, `${name}: ${JSON.stringify(r.mismatches.slice(0, 3))}`);
    assert.ok(r.tested >= 511);
  });
});

// ---------------------------------------------------------------- edge cases
