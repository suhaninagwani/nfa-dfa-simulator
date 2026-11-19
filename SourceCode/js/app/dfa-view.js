/**
 * app/dfa-view.js — shared DFA views used by the step player, the result
 * panel and the string tracer.
 *
 * Both builders take an optional step index `upTo`: when given, only the part
 * of the DFA discovered by steps[0..upTo] is returned, so the diagram and the
 * table "grow" as the user steps through the subset construction.
 */
(function () {
  'use strict';
  const { $, esc } = App;
  const A = window.Automata;

  /** Graph model of the (possibly partial) DFA for Render.draw(). */
  function dfaGraph(upTo) {
    const { dfa, steps, labels } = App.s;
    const showSets = $('showSets') ? $('showSets').checked : true;
    let states = dfa.states;
    const trans = [];
    if (upTo === undefined) {
      dfa.states.forEach(s => dfa.alphabet.forEach(a => trans.push({ from: s, to: dfa.delta[s][a], label: a })));
    } else {
      const seen = new Set();
      steps.slice(0, upTo + 1).forEach(st => {
        if (st.dfaState) seen.add(st.dfaState);
        if (st.type === 'transition') { seen.add(st.closure); trans.push({ from: st.dfaState, to: st.closure, label: st.symbol }); }
        if (st.type === 'dead') dfa.alphabet.forEach(a => trans.push({ from: A.DEAD, to: A.DEAD, label: a }));
      });
      states = dfa.states.filter(s => seen.has(s));
    }
    // accepting states are only marked once the algorithm reaches that step
    const finalsKnown = upTo === undefined || steps.slice(0, upTo + 1).some(s => s.type === 'finals');
    return {
      nodes: states.map(s => ({
        id: s, label: labels[s], sub: showSets && s !== A.DEAD ? s : '',
        isStart: s === dfa.start, isFinal: finalsKnown && dfa.finals.includes(s), cls: s === A.DEAD ? 'dead' : '',
      })),
      edges: trans,
    };
  }

  /** DFA transition table; unknown entries show "?" while stepping. */
  function dfaTableHTML(upTo) {
    const { dfa, steps, labels } = App.s;
    const filled = {};
    const seen = [];
    const lim = upTo === undefined ? steps.length - 1 : upTo;
    steps.slice(0, lim + 1).forEach(st => {
      if (st.dfaState && !seen.includes(st.dfaState)) seen.push(st.dfaState);
      if (st.type === 'transition') {
        if (!seen.includes(st.closure)) seen.push(st.closure);
        (filled[st.dfaState] = filled[st.dfaState] || {})[st.symbol] = st.closure;
      }
      if (st.type === 'dead') { filled[A.DEAD] = {}; dfa.alphabet.forEach(a => { filled[A.DEAD][a] = A.DEAD; }); }
    });
    let current = null, curSym = null;
    if (upTo !== undefined && steps[upTo]) { current = steps[upTo].dfaState; curSym = steps[upTo].symbol; }
    const finalsKnown = steps.slice(0, lim + 1).some(s => s.type === 'finals');
    const order = dfa.states.filter(s => seen.includes(s));

    let h = `<table><thead><tr><th>DFA state</th><th>NFA states</th>${dfa.alphabet.map(a => `<th>${esc(a)}</th>`).join('')}</tr></thead><tbody>`;
    order.forEach(s => {
      const mark = (s === dfa.start ? '→' : '') + (finalsKnown && dfa.finals.includes(s) ? '*' : '');
      h += `<tr class="${s === current ? 'cur' : ''}"><td><b>${mark}${esc(labels[s])}</b></td><td class="mono">${esc(s)}</td>`;
      dfa.alphabet.forEach(a => {
        const v = filled[s] && filled[s][a];
        h += `<td class="${s === current && a === curSym ? 'hit' : ''}">${v ? esc(labels[v]) : '<span class="pending">?</span>'}</td>`;
      });
      h += '</tr>';
    });
    return h + '</tbody></table>';
  }

  Object.assign(App, { dfaGraph, dfaTableHTML });
})();
