/**
 * app/steps.js — the step player (bottom bar) for the subset construction.
 *
 * Replays App.s.steps (the log produced by Automata.subsetConstruction):
 * rewind, back, play/pause, forward, skip to end, a scrubber and a speed
 * control. Every step is also listed and clickable, and each one is
 * explained in plain English. The DFA diagram and the transition table show only what has been
 * discovered up to the current step, so the DFA "grows" as you play.
 *
 * After a conversion the player starts at the LAST step (the finished DFA);
 * press rewind then play to watch it being built.
 */
(function () {
  'use strict';
  const { $, esc } = App;
  let playTimer = null;

  /** Plain-English explanation of one step, using the short DFA names. */
  function explain(st) {
    const { nfa, dfa, labels } = App.s;
    const L = n => labels[n] || n;
    switch (st.type) {
      case 'start':
        return `Begin at the NFA start state ${nfa.start}. Follow every ε-arrow from it (free moves that read no input). Every state you can reach this way is ${st.dfaState}, and that set becomes the DFA start state ${L(st.dfaState)}.`;
      case 'process':
        return `Take DFA state ${L(st.dfaState)} = ${st.dfaState} and work out where it goes on each input symbol: ${dfa.alphabet.join(', ')}.`;
      case 'transition': {
        if (st.move === App.A.DEAD)
          return `Reading ${st.symbol}: no state in ${st.dfaState} has an arrow labelled ${st.symbol}, so there is nowhere to go. The DFA moves to the dead state ∅.`;
        const tail = st.isNew
          ? `This set has not been seen before, so it becomes a new DFA state, ${L(st.closure)}.`
          : `This set is already DFA state ${L(st.closure)}, so we only draw the arrow ${L(st.dfaState)} –${st.symbol}→ ${L(st.closure)}.`;
        return `Reading ${st.symbol}: the arrows labelled ${st.symbol} from the states in ${st.dfaState} lead to ${st.move} (this is move). Following the ε-arrows from there gives ${st.closure} (this is the ε-closure). ${tail}`;
      }
      case 'dead':
        return `∅ is a trap state. It goes back to itself on every symbol, so once the input has no valid path it stays rejected. Now every DFA state has exactly one move per symbol.`;
      case 'finals':
        return dfa.finals.length
          ? `A DFA state accepts if its set contains an accepting NFA state (${nfa.finals.join(', ')}). That makes ${dfa.finals.map(L).join(', ')} accepting.`
          : `No set contains an accepting NFA state, so the DFA accepts nothing, the same as the NFA.`;
      case 'done':
        return `No unprocessed DFA states are left, so the construction stops. ${nfa.states.length} NFA states gave ${dfa.states.length} DFA states.`;
      default:
        return '';
    }
  }

  /** Short title shown in the clickable step list. */
  function title(st) {
    const L = n => App.s.labels[n] || n;
    switch (st.type) {
      case 'start': return `Start state ${L(st.dfaState)}`;
      case 'process': return `Process ${L(st.dfaState)}`;
      case 'transition': return `${L(st.dfaState)} on ${st.symbol} → ${L(st.closure)}`;
      case 'dead': return 'Dead state ∅';
      case 'finals': return 'Mark accepting states';
      default: return 'Finished';
    }
  }

  const delay = () => parseInt($('speedSel').value, 10) || 900;
  const atEnd = () => App.s.stepIdx >= App.s.steps.length - 1;

  function renderStep() {
    const s = App.s;
    if (!s.dfa) return;
    const st = s.steps[s.stepIdx];
    const last = s.steps.length - 1;

    // bottom bar
    $('stepCounter').textContent = `Step ${s.stepIdx + 1} of ${s.steps.length}`;
    $('stepMini').textContent = st.text;
    $('stepRange').max = last;
    $('stepRange').value = s.stepIdx;
    $('dfaTag').textContent = s.stepIdx === last ? 'result' : `being built, step ${s.stepIdx + 1}`;

    // explanation of the current step
    $('stepText').innerHTML =
      `<div class="formula">${esc(st.text).replace(/\{[^}]*\}|∅/g, m => `<b>${m}</b>`)}` +
      (st.dfaState ? `<span class="badge-state">${esc(s.labels[st.dfaState])}</span>` : '') + '</div>' +
      `<p class="words">${esc(explain(st))}</p>`;

    // highlight the DFA state being processed and the transition just computed
    const hlNodes = new Set(), hlEdges = new Set();
    if (st.dfaState) hlNodes.add(st.dfaState);
    if (st.type === 'transition') { hlNodes.add(st.closure); hlEdges.add(st.dfaState + '→' + st.closure); }
    if (st.type === 'finals' || st.type === 'done') hlNodes.clear();
    Render.draw($('dfaSvg'), App.dfaGraph(s.stepIdx), { nodes: hlNodes, edges: hlEdges });

    // highlight the NFA states inside the current subset
    const subset = st.type === 'transition' ? st.closure : st.dfaState;
    Render.draw($('nfaSvg'), App.nfaGraph(), { nodes: new Set((subset && s.dfa.sets[subset]) || []) });

    $('stepTable').innerHTML = App.dfaTableHTML(s.stepIdx);
    // every step is listed and clickable; later steps are dimmed until reached
    $('stepLog').innerHTML = s.steps.map((x, i) =>
      `<li class="${x.type}${i === s.stepIdx ? ' cur' : ''}${i > s.stepIdx ? ' later' : ''}">` +
      `<button type="button" data-step="${i}" aria-current="${i === s.stepIdx ? 'step' : 'false'}">` +
      `<span class="n">${i + 1}</span><span class="t">${esc(title(x))}</span>` +
      (x.type === 'transition' && x.isNew ? '<span class="newtag">new state</span>' : '') + '</button></li>').join('');
    const cur = $('stepLog').querySelector('li.cur');
    if (cur) {
      const box = $('stepLog');
      const top = cur.offsetTop - box.offsetTop;
      if (top < box.scrollTop || top > box.scrollTop + box.clientHeight - cur.offsetHeight) box.scrollTop = top - box.clientHeight / 2;
    }
  }

  function go(i) {
    const s = App.s;
    if (!s.dfa) return;
    s.stepIdx = Math.max(0, Math.min(s.steps.length - 1, i));
    renderStep();
  }

  function setPlaying(on) {
    $('playBtn').classList.toggle('playing', on);
    $('playBtn').setAttribute('aria-label', on ? 'Pause' : 'Play');
  }

  function pause() {
    if (playTimer) clearTimeout(playTimer);
    playTimer = null;
    setPlaying(false);
  }

  function tick() {
    if (atEnd()) return pause();
    go(App.s.stepIdx + 1);
    playTimer = setTimeout(tick, delay());
  }

  function togglePlay() {
    if (!App.s.dfa) return;
    if (playTimer) return pause();
    if (atEnd()) go(0); // play from the start if we are at the end
    setPlaying(true);
    playTimer = setTimeout(tick, delay());
  }

  App.on('init', () => {
    $('firstBtn').addEventListener('click', () => { pause(); go(0); });
    $('prevBtn').addEventListener('click', () => { pause(); go(App.s.stepIdx - 1); });
    $('nextBtn').addEventListener('click', () => { pause(); go(App.s.stepIdx + 1); });
    $('lastBtn').addEventListener('click', () => { pause(); go(App.s.steps.length - 1); });
    $('playBtn').addEventListener('click', togglePlay);
    $('stepRange').addEventListener('input', e => { pause(); go(parseInt(e.target.value, 10)); });
    // click any step in the list to jump straight to it
    $('stepLog').addEventListener('click', e => {
      const b = e.target.closest('button[data-step]');
      if (b) { pause(); go(parseInt(b.dataset.step, 10)); }
    });
    $('showSets').addEventListener('change', () => { if (App.s.dfa) renderStep(); });
    document.addEventListener('keydown', e => {
      if (e.target.matches('input, textarea, select, button')) return;
      const keys = { ArrowRight: () => go(App.s.stepIdx + 1), ArrowLeft: () => go(App.s.stepIdx - 1),
        Home: () => go(0), End: () => go(App.s.steps.length - 1), ' ': togglePlay };
      if (keys[e.key]) { e.preventDefault(); if (e.key !== ' ') pause(); keys[e.key](); }
    });
  });

  App.on('converted', () => { pause(); App.s.stepIdx = Math.max(0, App.s.steps.length - 1); renderStep(); });

  App.on('reset', () => {
    pause();
    Render.draw($('dfaSvg'), { nodes: [], edges: [] });
    $('stepTable').innerHTML = $('stepLog').innerHTML = '';
    $('stepText').textContent = 'Convert an automaton to begin.';
    $('stepCounter').textContent = 'No steps yet';
    $('stepMini').textContent = '';
    $('stepRange').max = 0; $('stepRange').value = 0;
    $('dfaTag').textContent = 'result';
  });

  App.renderStep = renderStep;
})();
