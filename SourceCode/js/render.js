/**
 * render.js — Dependency-free SVG renderer for automata state diagrams.
 *
 * Graph model:
 *   { nodes: [{ id, label, sub?, isStart, isFinal }],
 *     edges: [{ from, to, label }] }      (parallel edges are merged)
 *
 * Layout: breadth-first "layers" from the start node, left → right.
 * Edges are quadratic Bézier curves; reverse pairs and long edges are bent
 * so they do not overlap, self-loops are drawn above the node.
 */
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const R = 26;          // node radius
  const COL_W = 130;     // horizontal gap between layers
  const ROW_H = 112;     // vertical gap inside a layer

  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v));
    if (parent) parent.appendChild(e);
    return e;
  }

  /** Merge parallel edges: one arrow per (from,to) with a comma-joined label. */
  function mergeEdges(edges) {
    const map = new Map();
    edges.forEach(e => {
      const key = e.from + '\u0000' + e.to;
      if (!map.has(key)) map.set(key, { from: e.from, to: e.to, labels: [] });
      const m = map.get(key);
      if (!m.labels.includes(e.label)) m.labels.push(e.label);
    });
    return [...map.values()].map(m => ({ from: m.from, to: m.to, label: m.labels.join(', ') }));
  }

  /** BFS layering; unreachable nodes go in a final extra layer. */
  function layout(graph) {
    const startNode = graph.nodes.find(n => n.isStart) || graph.nodes[0];
    const adj = new Map(graph.nodes.map(n => [n.id, []]));
    graph.edges.forEach(e => { if (adj.has(e.from)) adj.get(e.from).push(e.to); });
    const layer = new Map();
    if (startNode) {
      layer.set(startNode.id, 0);
      const q = [startNode.id];
      while (q.length) {
        const s = q.shift();
        adj.get(s).forEach(t => { if (!layer.has(t)) { layer.set(t, layer.get(s) + 1); q.push(t); } });
      }
    }
    let maxL = Math.max(0, ...layer.values());
    graph.nodes.forEach(n => { if (!layer.has(n.id)) layer.set(n.id, maxL + 1); });
    maxL = Math.max(0, ...layer.values());

    const cols = [];
    graph.nodes.forEach(n => { const l = layer.get(n.id); (cols[l] = cols[l] || []).push(n.id); });
    const tallest = Math.max(1, ...cols.map(c => (c ? c.length : 0)));
    const pos = new Map();
    cols.forEach((col, l) => {
      if (!col) return;
      const offset = ((tallest - col.length) * ROW_H) / 2;
      // stagger nodes sharing a column so vertical edges between them do not overlap
      col.forEach((id, i) => pos.set(id, { x: 70 + l * COL_W + (col.length > 1 && i % 2 ? 45 : 0), y: 70 + offset + i * ROW_H, loopBelow: col.length > 1 && i === col.length - 1 }));
    });
    return { pos, width: 190 + maxL * COL_W, height: 140 + (tallest - 1) * ROW_H, layer };
  }

  /**
   * Draw a graph into an <svg> element.
   * @param {SVGElement} svg
   * @param {object} graph
   * @param {{nodes?:Set<string>, edges?:Set<string>, nodeClass?:object}} hl
   *        highlight sets; edge keys are "from→to".
   */
  function draw(svg, graph, hl) {
    hl = hl || {};
    const hn = hl.nodes || new Set();
    const he = hl.edges || new Set();
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    if (!graph.nodes.length) {
      svg.setAttribute('viewBox', '0 0 400 80');
      svg.style.minWidth = ''; svg.style.height = '260px';
      const t = el('text', { x: 200, y: 45, 'text-anchor': 'middle', class: 'empty-msg' }, svg);
      t.textContent = 'Convert an automaton to see it here';
      return;
    }
    const edges = mergeEdges(graph.edges);
    const { pos, width, height, layer } = layout(graph);
    const vbW = Math.max(width, 300), vbH = height + 60;
    svg.setAttribute('viewBox', `0 -20 ${vbW} ${vbH}`);
    // draw at close to natural size; big graphs scroll inside the paper instead of shrinking
    svg.style.minWidth = Math.round(vbW * 0.62) + 'px';
    svg.style.height = Math.round(Math.max(260, Math.min(520, vbH * 0.8))) + 'px';

    const defs = el('defs', {}, svg);
    ['arrow', 'arrow-hl'].forEach(id => {
      const m = el('marker', { id: svg.id + '-' + id, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      el('path', { d: 'M0,0 L10,5 L0,10 z', class: id === 'arrow' ? 'arrowhead' : 'arrowhead hl' }, m);
    });

    const edgeKeys = new Set(edges.map(e => e.from + '→' + e.to));
    const gEdges = el('g', {}, svg);
    const gNodes = el('g', {}, svg);

    edges.forEach(e => {
      const a = pos.get(e.from), b = pos.get(e.to);
      if (!a || !b) return;
      const key = e.from + '→' + e.to;
      const isHl = he.has(key);
      const cls = 'edge' + (isHl ? ' hl' : '');
      const marker = `url(#${svg.id}-${isHl ? 'arrow-hl' : 'arrow'})`;
      let d, lx, ly;
      if (e.from === e.to) {
        // self-loop above the node (below for the bottom node of a column)
        const x = a.x, k = a.loopBelow ? -1 : 1, y = a.y - k * R;
        d = `M ${x - 12} ${y + 4 * k} C ${x - 34} ${y - 52 * k}, ${x + 34} ${y - 52 * k}, ${x + 12} ${y + 4 * k}`;
        lx = a.loopBelow ? x + 30 : x; ly = a.loopBelow ? y + 40 : y - 44;
      } else {
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 1;
        const ux = dx / dist, uy = dy / dist;
        const reverse = edgeKeys.has(e.to + '→' + e.from);
        const span = Math.abs(layer.get(e.to) - layer.get(e.from));
        let bend = 0;
        if (reverse) bend = 34;
        if (span !== 1 || dx <= 0) bend = Math.max(bend, 30 + dist * 0.18);
        // perpendicular (left normal); backward edges bend the other way
        const nx = -uy, ny = ux;
        const mx = (a.x + b.x) / 2 + nx * bend, my = (a.y + b.y) / 2 + ny * bend;
        // trim to circle borders, aiming toward the control point
        const sa = Math.atan2(my - a.y, mx - a.x), ea = Math.atan2(my - b.y, mx - b.x);
        const sx = a.x + R * Math.cos(sa), sy = a.y + R * Math.sin(sa);
        const ex = b.x + (R + 2) * Math.cos(ea), ey = b.y + (R + 2) * Math.sin(ea);
        d = `M ${sx} ${sy} Q ${mx} ${my} ${ex} ${ey}`;
        // label at curve midpoint (t = 0.5)
        lx = 0.25 * sx + 0.5 * mx + 0.25 * ex;
        ly = 0.25 * sy + 0.5 * my + 0.25 * ey - 6;
      }
      el('path', { d, class: cls, 'marker-end': marker }, gEdges);
      const bg = el('text', { x: lx, y: ly, 'text-anchor': 'middle', class: 'edge-label-bg' + (isHl ? ' hl' : '') }, gEdges);
      bg.textContent = e.label;
      const t = el('text', { x: lx, y: ly, 'text-anchor': 'middle', class: 'edge-label' + (isHl ? ' hl' : '') }, gEdges);
      t.textContent = e.label;
    });

    graph.nodes.forEach(n => {
      const p = pos.get(n.id);
      const g = el('g', { class: 'node' + (hn.has(n.id) ? ' hl' : '') + (n.isFinal ? ' final' : '') + (n.cls ? ' ' + n.cls : '') }, gNodes);
      const title = el('title', {}, g);
      title.textContent = n.sub ? `${n.label} = ${n.sub}` : n.label;
      if (n.isStart) {
        el('path', { d: `M ${p.x - R - 30} ${p.y} L ${p.x - R - 2} ${p.y}`, class: 'edge start-arrow', 'marker-end': `url(#${svg.id}-arrow)` }, g);
      }
      el('circle', { cx: p.x, cy: p.y, r: R, class: 'state' }, g);
      if (n.isFinal) el('circle', { cx: p.x, cy: p.y, r: R - 5, class: 'state inner' }, g);
      const t = el('text', { x: p.x, y: p.y + 5, 'text-anchor': 'middle', class: 'state-label' }, g);
      t.textContent = n.label.length > 6 ? n.label.slice(0, 5) + '…' : n.label;
      if (n.sub) {
        const s = el('text', { x: p.x, y: p.y + R + (p.loopBelow ? 50 : 16), 'text-anchor': 'middle', class: 'state-sub' }, g);
        s.textContent = n.sub.length > 22 ? n.sub.slice(0, 21) + '…}' : n.sub;
      }
    });
  }

  root.Render = { draw, mergeEdges };
})(window);
