/**
 * automata/parser.js — parsing and validation of the text automaton definition.
 * Part of the ε-NFA → DFA Simulator core. Pure functions (no DOM), shared
 * through the global `Automata` namespace in the browser and via require() in Node.
 */
(function (root) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) require('./closure.js');
  const NS = (root.Automata = root.Automata || {});
  const { EPS, EPS_ALIASES } = NS;

  /** Split "a, b c" style lists into clean tokens. */
  function splitList(text) {
    return String(text || '')
      .split(/[\s,;]+/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  /**
   * Parse the textual automaton definition used in the UI.
   *
   * Format (one item per line, '//' starts a comment):
   *   states:   q0 q1 q2
   *   alphabet: a b
   *   start:    q0
   *   final:    q2
   *   q0 a q0,q1        <- transition lines: FROM SYMBOL TO[,TO...]
   *   q1 ε q2
   *
   * @param {string} text  raw definition
   * @returns {{nfa: object|null, errors: string[], warnings: string[]}}
   *   errors   — fatal problems; nfa is null when any exist.
   *   warnings — non-fatal notes (e.g. unreachable states).
   */
  function parseNFA(text) {
    const errors = [];
    const warnings = [];
    let states = null, alphabet = null, start = null, finals = null;
    const rawTransitions = [];

    const lines = String(text || '').split(/\r?\n/);
    lines.forEach((rawLine, idx) => {
      const lineNo = idx + 1;
      const line = rawLine.replace(/\/\/.*$/, '').trim();
      if (!line) return;

      const header = line.match(/^(states|alphabet|sigma|start|initial|finals?|accept(?:ing)?)\s*[:=]\s*(.*)$/i);
      if (header) {
        const key = header[1].toLowerCase();
        const vals = splitList(header[2].replace(/[{}]/g, ''));
        if (key === 'states') states = vals;
        else if (key === 'alphabet' || key === 'sigma') alphabet = vals;
        else if (key === 'start' || key === 'initial') {
          if (vals.length !== 1) errors.push(`Line ${lineNo}: exactly one start state is required (got ${vals.length}).`);
          start = vals[0] || null;
        } else finals = vals; // final(s) / accept(ing) — may legitimately be empty
        return;
      }

      // Transition line: FROM SYMBOL TO[,TO...]   ("->" and braces are ignored)
      const cleaned = line.replace(/->|→/g, ' ').replace(/[{}()]/g, ' ');
      const parts = cleaned.split(/\s+/).filter(Boolean);
      if (parts.length < 3) {
        errors.push(`Line ${lineNo}: could not understand "${rawLine.trim()}". Expected: FROM SYMBOL TO[,TO]`);
        return;
      }
      rawTransitions.push({ lineNo, from: parts[0], sym: parts[1], to: splitList(parts.slice(2).join(',')) });
    });

    if (!states || states.length === 0) errors.push('Missing "states:" line (at least one state is required).');
    if (!alphabet) errors.push('Missing "alphabet:" line.');
    if (!start) errors.push('Missing "start:" line.');
    if (!finals) { finals = []; warnings.push('No "final:" line — the automaton accepts nothing (empty language).'); }
    if (errors.length) return { nfa: null, errors, warnings };

    // Duplicate / reserved names
    const stateSet = new Set();
    states.forEach(s => {
      if (stateSet.has(s)) warnings.push(`State "${s}" listed more than once — duplicate ignored.`);
      stateSet.add(s);
    });
    states = [...stateSet];
    alphabet = [...new Set(alphabet)];
    alphabet.forEach(a => {
      if (EPS_ALIASES.has(a)) errors.push(`"${a}" is reserved for epsilon and cannot be an input symbol.`);
      if (a.length !== 1) errors.push(`Alphabet symbol "${a}" must be a single character.`);
    });
    if (alphabet.length === 0) errors.push('Alphabet must contain at least one symbol.');
    if (!stateSet.has(start)) errors.push(`Start state "${start}" is not in the list of states.`);
    finals.forEach(f => { if (!stateSet.has(f)) errors.push(`Final state "${f}" is not in the list of states.`); });

    const delta = {};
    states.forEach(s => { delta[s] = {}; });
    rawTransitions.forEach(t => {
      const sym = EPS_ALIASES.has(t.sym) ? EPS : t.sym;
      if (!stateSet.has(t.from)) { errors.push(`Line ${t.lineNo}: unknown source state "${t.from}".`); return; }
      if (sym !== EPS && !alphabet.includes(sym)) { errors.push(`Line ${t.lineNo}: symbol "${t.sym}" is not in the alphabet {${alphabet.join(', ')}}.`); return; }
      if (t.to.length === 0) { errors.push(`Line ${t.lineNo}: transition has no target state.`); return; }
      t.to.forEach(dest => {
        if (!stateSet.has(dest)) { errors.push(`Line ${t.lineNo}: unknown target state "${dest}".`); return; }
        const list = (delta[t.from][sym] = delta[t.from][sym] || []);
        if (!list.includes(dest)) list.push(dest);
      });
    });

    if (errors.length) return { nfa: null, errors, warnings };

    const nfa = { states, alphabet, start, finals: [...new Set(finals)], delta };
    const reach = reachableStates(nfa);
    const unreachable = states.filter(s => !reach.has(s));
    if (unreachable.length) warnings.push(`Unreachable state(s) from start: ${unreachable.join(', ')} (they cannot affect the result).`);
    return { nfa, errors, warnings };
  }

  /** Inverse of parseNFA: produce the text format from an NFA object. */
  function serializeNFA(nfa) {
    const lines = [
      `states: ${nfa.states.join(' ')}`,
      `alphabet: ${nfa.alphabet.join(' ')}`,
      `start: ${nfa.start}`,
      `final: ${nfa.finals.join(' ')}`,
    ];
    nfa.states.forEach(s => {
      Object.keys(nfa.delta[s] || {}).forEach(sym => {
        lines.push(`${s} ${sym} ${nfa.delta[s][sym].join(',')}`);
      });
    });
    return lines.join('\n');
  }

  /** All states reachable from start using any transitions (incl. ε). */
  function reachableStates(nfa) {
    const seen = new Set([nfa.start]);
    const stack = [nfa.start];
    while (stack.length) {
      const s = stack.pop();
      Object.values(nfa.delta[s] || {}).forEach(targets => targets.forEach(t => {
        if (!seen.has(t)) { seen.add(t); stack.push(t); }
      }));
    }
    return seen;
  }

  Object.assign(NS, { parseNFA, serializeNFA, reachableStates });
  if (typeof module !== 'undefined' && module.exports) module.exports = NS;
})(typeof window !== 'undefined' ? window : globalThis);
