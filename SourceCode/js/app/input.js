/**
 * app/input.js — the definition editor, examples, parsing, the NFA diagram
 * (or its transition table) and its "about this diagram" card.
 *
 * convert() parses the definition. If the subset-construction module is
 * loaded it also builds the DFA. Then it emits 'converted' so the other
 * panels can redraw.
 */
(function () {
  'use strict';
  const { $, esc, message } = App;
  const A = window.Automata;

  /** NFA transition table, with the ε-closure of every state in the last column. */
  function nfaTableHTML(nfa) {
    const syms = [...nfa.alphabet, A.EPS];
    const set = arr => (arr && arr.length ? `{${esc(arr.join(','))}}` : '∅');
    let h = `<table><thead><tr><th>State</th>${syms.map(a => `<th>${esc(a)}</th>`).join('')}<th>ε-closure</th></tr></thead><tbody>`;
    nfa.states.forEach(s => {
      const mark = (s === nfa.start ? '→' : '') + (nfa.finals.includes(s) ? '*' : '');
      const closure = A.sortStates(nfa, A.epsilonClosure(nfa, [s]));
      h += `<tr><td><b>${mark}${esc(s)}</b></td>${syms.map(a => `<td class="mono">${set(nfa.delta[s][a])}</td>`).join('')}<td class="mono">${set(closure)}</td></tr>`;
    });
    return h + '</tbody></table><p class="hint">→ start state, * accepting state. The ε-closure is every state reachable using only ε-arrows.</p>';
  }

  /** Diagram / Table switch on each sheet. */
  function wireViewToggles() {
    document.querySelectorAll('.sheet').forEach(sheet => {
      const buttons = sheet.querySelectorAll('.view-toggle button');
      buttons.forEach(btn => btn.addEventListener('click', () => {
        const table = btn.dataset.view === 'table';
        buttons.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        sheet.querySelector('.paper').hidden = table;
        sheet.querySelector('.sheet-table').hidden = !table;
      }));
    });
  }

  const LEGEND = `<div class="legend">
    <span><svg viewBox="0 0 26 18"><path d="M1 9h14"/><path d="M12 5l4 4-4 4"/><circle cx="21" cy="9" r="4"/></svg>start</span>
    <span><svg viewBox="0 0 26 18"><circle cx="13" cy="9" r="7"/><circle cx="13" cy="9" r="4"/></svg>accepting</span>
    <span><svg viewBox="0 0 26 18"><path d="M2 12 Q13 0 24 12"/></svg>ε moves without reading</span>
    <span><svg viewBox="0 0 26 18"><circle class="sw-hl" cx="13" cy="9" r="7"/></svg>in the current subset</span>
  </div>`;

  /** "About this diagram" card: counts, and why the machine is non-deterministic. */
  function nfaInfoHTML(nfa) {
    let total = 0, eps = 0;
    const choices = [];     // (state, symbol) pairs with more than one target
    nfa.states.forEach(s => {
      Object.entries(nfa.delta[s]).forEach(([sym, ts]) => {
        total += ts.length;
        if (sym === A.EPS) eps += ts.length;
        else if (ts.length > 1) choices.push(`${s} on ${sym} can go to ${ts.join(' or ')}`);
      });
    });
    const list = nfa.states.length <= 8 ? nfa.states.join(', ') : `${nfa.states[0]} to ${nfa.states[nfa.states.length - 1]}`;

    const reasons = [];
    if (eps) reasons.push(`it has ${eps} ε-move${eps > 1 ? 's' : ''}, so it can change state without reading anything`);
    if (choices.length) reasons.push(`${choices.slice(0, 2).join('; ')}${choices.length > 2 ? ` (and ${choices.length - 2} more)` : ''}`);
    const why = reasons.length
      ? `This machine is non-deterministic because ${reasons.join(', and ')}. The DFA has to track every state the NFA could be in at once.`
      : 'This machine has no ε-moves and never more than one choice, so it is already almost a DFA. Converting it adds the missing moves.';

    return `<dl>
        <dt>States</dt><dd>${nfa.states.length} (${esc(list)})</dd>
        <dt>Alphabet</dt><dd>{${esc(nfa.alphabet.join(', '))}}</dd>
        <dt>Start</dt><dd>${esc(nfa.start)}</dd>
        <dt>Accepting</dt><dd>${esc(nfa.finals.join(', ') || 'none')}</dd>
        <dt>Moves</dt><dd>${total}${eps ? `, of which ${eps} are ε-moves` : ''}</dd>
      </dl>
      <p class="why">${esc(why)}</p>
      ${LEGEND}`;
  }

  /** Short DFA names A, B, …, Z, A1… in discovery order; the dead state stays ∅. */
  function makeLabels(order) {
    const map = {};
    let k = 0;
    order.forEach(n => {
      if (n === A.DEAD) { map[n] = A.DEAD; return; }
      const letter = String.fromCharCode(65 + (k % 26));
      map[n] = k < 26 ? letter : letter + Math.floor(k / 26);
      k++;
    });
    return map;
  }

  function convert() {
    const { nfa, errors, warnings } = A.parseNFA($('definition').value);
    $('messages').innerHTML = message('error', errors) + message('warn', warnings);
    if (!nfa) { reset(); return; }

    const s = App.s;
    s.nfa = nfa;
    s.dfa = null; s.steps = []; s.labels = {}; s.stepIdx = 0;
    let summary = `Parsed ${nfa.states.length} states, alphabet {${nfa.alphabet.join(', ')}}.`;
    if (A.subsetConstruction) {
      const res = A.subsetConstruction(nfa);
      s.dfa = res.dfa; s.steps = res.steps; s.labels = makeLabels(res.dfa.states);
      summary += ` DFA has ${res.dfa.states.length} states.`;
    }
    $('messages').innerHTML += message('ok', [summary]);

    Render.draw($('nfaSvg'), App.nfaGraph());
    $('nfaInfo').innerHTML = nfaInfoHTML(nfa);
    $('nfaTable').innerHTML = nfaTableHTML(nfa);
    App.emit('converted');
  }

  function reset() {
    Object.assign(App.s, { nfa: null, dfa: null, steps: [], labels: {}, stepIdx: 0 });
    Render.draw($('nfaSvg'), { nodes: [], edges: [] });
    $('nfaInfo').innerHTML = '';
    $('nfaTable').innerHTML = '';
    App.emit('reset');
  }

  /** Load a built-in example (and its preset test cases, if available). */
  function loadExample(name) {
    $('definition').value = A.EXAMPLES[name];
    const presets = App.presetTests || {};
    if ($('batchInput')) $('batchInput').value = presets[name] || '';
    convert();
  }

  App.on('init', () => {
    wireViewToggles();
    const sel = $('example');
    Object.keys(A.EXAMPLES || {}).forEach(name => {
      const o = document.createElement('option');
      o.value = o.textContent = name;
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => loadExample(sel.value));
    $('convertBtn').addEventListener('click', convert);
    $('clearBtn').addEventListener('click', () => { $('definition').value = ''; $('messages').innerHTML = ''; reset(); });
  });

  Object.assign(App, { convert, reset, loadExample });
})();
