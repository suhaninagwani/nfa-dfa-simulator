/**
 * app/trace.js — Panel 5: run a string on both machines, with an animated trace.
 */
(function () {
  'use strict';
  const { $, esc, message, showStr } = App;
  const A = window.Automata;
  let traceTimer = null;

  /** Text box value → input string ("ε" / "eps" mean the empty string). */
  function parseTestString(raw) {
    const s = raw.trim();
    return s === 'ε' || s === 'eps' ? '' : s;
  }

  const verdict = ok => `<span class="badge ${ok ? 'acc' : 'rej'}">${ok ? 'Accepted' : 'Rejected'}</span>`;

  function run(animate) {
    const { nfa, dfa, labels } = App.s;
    if (!dfa) { $('runResult').innerHTML = message('error', ['Convert an automaton first.']); return; }
    if (traceTimer) clearInterval(traceTimer);

    const input = parseTestString($('testInput').value);
    const rn = A.simulateNFA(nfa, input), rd = A.simulateDFA(dfa, input);
    if (rn.error) {
      $('runResult').innerHTML = message('error', [rn.error]);
      $('nfaTrace').innerHTML = $('dfaTrace').innerHTML = '';
      return;
    }
    $('runResult').innerHTML = `<div class="verdict">Input <code>${esc(showStr(input))}</code> → NFA ${verdict(rn.accepted)} DFA ${verdict(rd.accepted)} ` +
      (rn.accepted === rd.accepted ? '<span class="badge acc">Both agree ✓</span>' : '<span class="badge rej">They disagree ✗</span>') + '</div>';

    // draw the traces up to symbol k and highlight the current states
    const drawTrace = k => {
      $('nfaTrace').innerHTML = `<table><thead><tr><th>#</th><th>read</th><th>active NFA states</th></tr></thead><tbody>${rn.trace.map((t, i) =>
        `<tr class="${i === k ? 'cur' : ''} ${i > k ? 'dim' : ''}"><td>${i}</td><td>${t.symbol === null ? '—' : esc(t.symbol)}</td><td class="mono">{${esc(t.states.join(','))}}</td></tr>`).join('')}</tbody></table>`;
      $('dfaTrace').innerHTML = `<table><thead><tr><th>#</th><th>read</th><th>DFA state</th></tr></thead><tbody>${rd.trace.map((t, i) =>
        `<tr class="${i === k ? 'cur' : ''} ${i > k ? 'dim' : ''}"><td>${i}</td><td>${t.symbol === null ? '—' : esc(t.symbol)}</td><td><b>${esc(labels[t.state])}</b> <span class="mono">${esc(t.state)}</span></td></tr>`).join('')}</tbody></table>`;
      const cur = rd.trace[k], prev = rd.trace[k - 1];
      Render.draw($('dfaSvg'), App.dfaGraph(), { nodes: new Set([cur.state]), edges: new Set(prev ? [prev.state + '→' + cur.state] : []) });
      Render.draw($('nfaSvg'), App.nfaGraph(), { nodes: new Set(rn.trace[k].states) });
    };

    if (!animate) { drawTrace(rd.trace.length - 1); return; }
    let k = 0;
    drawTrace(0);
    traceTimer = setInterval(() => {
      k++;
      if (k >= rd.trace.length) { clearInterval(traceTimer); return; }
      drawTrace(k);
    }, 800);
  }

  App.on('init', () => {
    $('runBtn').addEventListener('click', () => run(false));
    $('traceBtn').addEventListener('click', () => run(true));
    $('testInput').addEventListener('keydown', e => { if (e.key === 'Enter') run(false); });
  });
  App.on('converted', () => { $('runResult').innerHTML = $('nfaTrace').innerHTML = $('dfaTrace').innerHTML = ''; });
  App.on('reset', () => { if (traceTimer) clearInterval(traceTimer); $('runResult').innerHTML = $('nfaTrace').innerHTML = $('dfaTrace').innerHTML = ''; });

  App.parseTestString = parseTestString;
})();
