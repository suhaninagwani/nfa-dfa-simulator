/**
 * app/validation.js — Panel 6: exhaustive equivalence check and
 * expected-vs-actual test cases.
 */
(function () {
  'use strict';
  const { $, esc, message, showStr } = App;
  const A = window.Automata;

  /** Preset test cases for each built-in example: "string expected". */
  App.presetTests = {
    'ε-NFA: (a|b)*abb (textbook)': 'abb accept\naabb accept\nbabb accept\nab reject\nε reject\nabba reject\nabbabb accept',
    'NFA: strings ending in 01': '01 accept\n101 accept\n0001 accept\n10 reject\nε reject\n011 reject',
    'ε-NFA: a*b*': 'ε accept\na accept\naabbb accept\nb accept\nba reject\naba reject',
    'NFA: 3rd symbol from end is 1': '100 accept\n0101 accept\n111 accept\n011 reject\n1 reject\nε reject',
    'ε-NFA: contains "ab" or "ba"': 'ab accept\nba accept\naab accept\naaa reject\nbbb reject\nε reject',
  };

  const toInput = raw => (raw === 'ε' || raw === 'eps' ? '' : raw);

  function equivalence() {
    const { nfa, dfa } = App.s;
    if (!dfa) { $('eqResult').innerHTML = message('error', ['Convert an automaton first.']); return; }
    const n = Math.max(0, Math.min(12, parseInt($('eqLen').value, 10) || 0));
    const t0 = performance.now();
    const r = A.checkEquivalence(nfa, dfa, n);
    const ms = (performance.now() - t0).toFixed(1);
    const capped = r.maxLen < n ? ` (length reduced to ${r.maxLen} to keep it fast)` : '';
    $('eqResult').innerHTML = r.mismatches.length === 0
      ? `<div class="msg ok"><b>Equivalent ✓</b> NFA and DFA agree on all <b>${r.tested}</b> strings of length 0–${r.maxLen}${capped}. (${ms} ms)</div>`
      : `<div class="msg error"><b>${r.mismatches.length} mismatch(es)</b><ul>${r.mismatches.slice(0, 10).map(m => `<li>${esc(showStr(m.input))}: NFA ${m.nfa}, DFA ${m.dfa}</li>`).join('')}</ul></div>`;
  }

  function batch() {
    const { nfa, dfa } = App.s;
    if (!dfa) { $('batchResult').innerHTML = message('error', ['Convert an automaton first.']); return; }
    const lines = $('batchInput').value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let pass = 0;
    const rows = lines.map((line, i) => {
      const [rawStr, rawExp] = line.split(/\s+/);
      const input = toInput(rawStr || '');
      const expected = /^acc/i.test(rawExp || '') ? true : /^rej/i.test(rawExp || '') ? false : null;
      const rn = A.simulateNFA(nfa, input), rd = A.simulateDFA(dfa, input);
      let status, cls;
      if (rn.error) { status = 'Invalid input'; cls = 'warnrow'; }
      else if (expected === null) { status = 'No expected value'; cls = 'warnrow'; }
      else if (rn.accepted === expected && rd.accepted === expected) { status = 'Pass'; cls = 'passrow'; pass++; }
      else { status = 'Fail'; cls = 'failrow'; }
      const fmt = r => (r.error ? '—' : r.accepted ? 'Accept' : 'Reject');
      return `<tr class="${cls}"><td>T${String(i + 1).padStart(2, '0')}</td><td class="mono">${esc(showStr(input))}</td><td>${expected === null ? '?' : expected ? 'Accept' : 'Reject'}</td><td>${fmt(rn)}</td><td>${fmt(rd)}</td><td><b>${status}</b></td></tr>`;
    });
    $('batchResult').innerHTML = `<p><b>${pass} / ${lines.length}</b> passed</p><table><thead><tr><th>ID</th><th>Input</th><th>Expected</th><th>NFA</th><th>DFA</th><th>Status</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
  }

  App.on('init', () => {
    $('eqBtn').addEventListener('click', equivalence);
    $('batchBtn').addEventListener('click', batch);
  });
  const clear = () => { $('eqResult').innerHTML = $('batchResult').innerHTML = ''; };
  App.on('converted', clear);
  App.on('reset', clear);
})();
