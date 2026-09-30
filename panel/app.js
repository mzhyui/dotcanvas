(function () {
  'use strict';
  const G = window.CanvasGeometry;
  const markdown = window.markdownit({ html: false });
  const MIN_WIDTH = 180, MIN_HEIGHT = 120;
  markdown.renderer.rules.link_open = (tokens, index, options, env, renderer) => {
    tokens[index].attrSet('target', '_blank');
    tokens[index].attrSet('rel', 'noopener noreferrer');
    return renderer.renderToken(tokens, index, options);
  };
  const SECTIONS = ['Introduction', 'Related Work', 'Method', 'Evaluation', 'Conclusion'];
  const COLORS = { '1': '#3b82f6', '2': '#8b5cf6', '3': '#10b981', '4': '#f59e0b', '5': '#ef4444', '6': '#64748b' };
  const $ = id => document.getElementById(id);
  const viewport = $('viewport'), world = $('world'), cards = $('cards'), edges = $('edges');
  const inspector = $('inspector'), saveState = $('save-state'), marquee = $('marquee');
  const cardElements = new Map(), edgeElements = new Map();
  let canvas, selectedNodes = new Set(), selectedEdges = new Set(), filter = '';
  let scale = 1, pan = { x: 0, y: 0 }, gesture = null, history = [], future = [];
  let saveTimer, pendingPayload = null, saveChain = Promise.resolve(), revision = 0, previewPath;
  const uid = p => `${p}-${crypto.randomUUID()}`;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const node = id => canvas.nodes.find(n => n.id === id);
  const visible = n => !filter || `${n.text} ${n.section || ''}`.toLowerCase().includes(filter);
  const additive = e => e.ctrlKey || e.metaKey || e.shiftKey;
  const point = e => ({ x: e.clientX, y: e.clientY });
  const worldPoint = e => G.screenToWorld(point(e), viewport.getBoundingClientRect(), pan, scale);
  const title = n => (n.text.split('\n').find(s => s.trim()) || n.section || 'Untitled').replace(/^#{1,6}\s+/, '');

  function seed() {
    const descriptions = ['Frame the problem, motivation, and contribution.', 'Position the paper against the closest prior work.', 'Describe the proposed approach and its assumptions.', 'Define datasets, baselines, metrics, and research questions.', 'Summarize findings, limitations, and future work.'];
    return { nodes: SECTIONS.map((section, i) => ({ id: `node-${i + 1}`, type: 'text', x: 80 + i % 3 * 330,
      y: 80 + Math.floor(i / 3) * 260, width: 280, height: 190, color: String(i % 6 + 1),
      text: `# ${section}\n\n${descriptions[i]}`, section, status: 'draft', path: '', anchor: '' })), edges: [], metadata: { dotcanvas: { version: 1 } } };
  }
  function valid(c) {
    if (!c || !Array.isArray(c.nodes) || !Array.isArray(c.edges)) throw Error('Canvas must contain nodes and edges arrays.');
    const ids = new Set(), edgeIds = new Set();
    for (const n of c.nodes) {
      if (!n.id || typeof n.id !== 'string' || ids.has(n.id)) throw Error('Canvas contains duplicate or invalid node IDs.');
      if (!['text', 'file', 'link'].includes(n.type)) throw Error(`Unsupported node type: ${n.type}`);
      if (typeof n.text !== 'string' || !['x', 'y', 'width', 'height'].every(k => Number.isFinite(n[k]))) throw Error(`Invalid card: ${n.id}`);
      ids.add(n.id);
    }
    for (const e of c.edges) {
      if (typeof e.id !== 'string' || edgeIds.has(e.id)) throw Error('Canvas contains duplicate or invalid edge IDs.');
      if (!ids.has(e.fromNode) || !ids.has(e.toNode)) throw Error(`Edge ${e.id} points to a missing node.`);
      edgeIds.add(e.id);
    }
    return c;
  }
  function snapshot() {
    return { contents: JSON.stringify(canvas), nodes: [...selectedNodes], edges: [...selectedEdges] };
  }
  function remember(before) {
    history.push(before);
    if (history.length > 50) history.shift();
    future = [];
    updateHistory();
  }
  function updateHistory() {
    $('undo').disabled = !history.length;
    $('redo').disabled = !future.length;
  }
  function reconcileSelection() {
    selectedNodes = new Set([...selectedNodes].filter(id => canvas.nodes.some(n => n.id === id && visible(n))));
    selectedEdges = new Set([...selectedEdges].filter(id => canvas.edges.some(e => e.id === id && visible(node(e.fromNode)) && visible(node(e.toNode)))));
  }
  function restore(state) {
    canvas = JSON.parse(state.contents);
    selectedNodes = new Set(state.nodes);
    selectedEdges = new Set(state.edges);
    render();
    scheduleSave();
  }
  function commit(fn) {
    cancelGesture();
    const before = snapshot();
    fn();
    if (before.contents === JSON.stringify(canvas)) return;
    remember(before);
    render();
    scheduleSave();
  }
  function undo() {
    cancelGesture();
    if (!history.length) return;
    future.push(snapshot());
    restore(history.pop());
    updateHistory();
  }
  function redo() {
    cancelGesture();
    if (!future.length) return;
    history.push(snapshot());
    restore(future.pop());
    updateHistory();
  }
  function svg(tag, attributes = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([key, value]) => el.setAttribute(key, value));
    return el;
  }
  function render() {
    reconcileSelection();
    const scroll = new Map([...cardElements].map(([id, el]) => {
      const body = el.querySelector('.body');
      return [id, { top: body.scrollTop, left: body.scrollLeft }];
    }));
    cards.replaceChildren();
    cardElements.clear();
    edges.innerHTML = '<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L8,4 L0,8 z" fill="#64748b"/></marker></defs>';
    edgeElements.clear();
    for (const n of canvas.nodes) {
      const el = document.createElement('article');
      el.className = `card${visible(n) ? '' : ' hidden'}`;
      el.dataset.id = n.id;
      el.style.width = n.width + 'px';
      el.style.height = n.height + 'px';
      el.style.setProperty('--card-color', COLORS[n.color] || COLORS['1']);
      const path = n.path ? `${n.path}${n.anchor ? '#' + n.anchor : ''}` : '';
      const shortPath = n.path ? `${n.path.split(/[\\/]/).pop()}${n.anchor ? '#' + n.anchor : ''}` : '';
      el.innerHTML = `<div class="card-content"><div class="card-header"><span class="card-section" title="${esc(title(n))}">${esc(n.section || 'Card')}</span><span class="status">${esc(n.status || 'draft')}</span></div><div class="body markdown" tabindex="0" aria-label="${esc(title(n))}">${n.text.trim() ? markdown.render(n.text) : '<p class="muted">Add Markdown in the side panel…</p>'}</div>${path ? `<div class="tag" title="${esc(path)}">${esc(shortPath)}</div>` : ''}</div>`;
      for (const side of G.SIDES) {
        const handle = document.createElement('button');
        handle.type = 'button';
        handle.className = `handle handle-${side}`;
        handle.dataset.side = side;
        handle.setAttribute('aria-label', `Connect ${title(n)} from ${side}`);
        handle.title = `Drag ${side} connection`;
        el.appendChild(handle);
      }
      const resize = document.createElement('button');
      resize.type = 'button';
      resize.className = 'resize-handle';
      resize.setAttribute('aria-label', `Resize ${title(n)}`);
      resize.title = 'Drag to resize; use arrow keys for 10 px steps (Shift: 1 px)';
      el.appendChild(resize);
      cards.appendChild(el);
      if (scroll.has(n.id)) {
        el.querySelector('.body').scrollTop = scroll.get(n.id).top;
        el.querySelector('.body').scrollLeft = scroll.get(n.id).left;
      }
      cardElements.set(n.id, el);
    }
    for (const edge of canvas.edges) {
      const group = svg('g', { 'data-edge-id': edge.id });
      const line = svg('path', { class: 'edge-line', 'marker-end': 'url(#arrow)' });
      const hit = svg('path', { class: 'edge-hit', 'data-edge-id': edge.id });
      const label = svg('text', { class: 'edge-label', 'text-anchor': 'middle', dy: -8 });
      label.textContent = edge.label || '';
      group.append(line, hit, label);
      edges.appendChild(group);
      edgeElements.set(edge.id, { group, line, hit, label });
    }
    previewPath = svg('path', { class: 'connection-preview hidden', 'marker-end': 'url(#arrow)' });
    edges.appendChild(previewPath);
    updatePositions();
    updateTransform();
    updateSelection();
    $('empty').classList.toggle('hidden', canvas.nodes.length > 0);
  }
  function updatePositions() {
    for (const n of canvas.nodes) {
      const el = cardElements.get(n.id);
      el.style.left = n.x + 'px';
      el.style.top = n.y + 'px';
      el.style.width = n.width + 'px';
      el.style.height = n.height + 'px';
    }
    for (const e of canvas.edges) {
      const a = node(e.fromNode), b = node(e.toNode), el = edgeElements.get(e.id);
      const fromSide = G.SIDES.includes(e.fromSide) ? e.fromSide : 'right';
      const toSide = G.SIDES.includes(e.toSide) ? e.toSide : 'left';
      const start = G.anchor(a, fromSide), end = G.anchor(b, toSide);
      const d = G.curve(start, fromSide, end, toSide);
      el.line.setAttribute('d', d);
      el.hit.setAttribute('d', d);
      el.label.setAttribute('x', (start.x + end.x) / 2);
      el.label.setAttribute('y', (start.y + end.y) / 2);
      el.group.classList.toggle('hidden', !visible(a) || !visible(b));
    }
  }
  function updateTransform() {
    world.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${scale})`;
  }
  function updateSelection(refreshInspector = true) {
    for (const [id, el] of cardElements) el.classList.toggle('selected', selectedNodes.has(id));
    for (const [id, el] of edgeElements) el.group.classList.toggle('selected', selectedEdges.has(id));
    if (refreshInspector) renderInspector();
  }
  function deleteSelection() {
    if (!selectedNodes.size && !selectedEdges.size) return;
    commit(() => {
      canvas.nodes = canvas.nodes.filter(n => !selectedNodes.has(n.id));
      canvas.edges = canvas.edges.filter(e => !selectedEdges.has(e.id) && !selectedNodes.has(e.fromNode) && !selectedNodes.has(e.toNode));
      selectedNodes.clear();
      selectedEdges.clear();
    });
  }
  function applyEditor(fn) {
    const active = inspector.contains(document.activeElement) ? document.activeElement : null;
    const source = $('f-body'), detailsOpen = inspector.querySelector('details')?.open;
    const view = { top: inspector.scrollTop, sourceTop: source?.scrollTop, sourceLeft: source?.scrollLeft,
      id: active?.id, start: active?.selectionStart, end: active?.selectionEnd, direction: active?.selectionDirection };
    commit(fn);
    const next = view.id && $(view.id);
    if (next) {
      next.focus({ preventScroll: true });
      if (view.start != null) next.setSelectionRange(view.start, view.end, view.direction);
    }
    if ($('f-body')) {
      $('f-body').scrollTop = view.sourceTop;
      $('f-body').scrollLeft = view.sourceLeft;
      inspector.querySelector('details').open = detailsOpen;
    }
    inspector.scrollTop = view.top;
  }
  function renderInspector() {
    if (!selectedNodes.size && !selectedEdges.size) {
      inspector.innerHTML = '<p class="muted">Select a card to edit its Markdown. Drag its bottom-right corner to resize, or use Width and Height in this panel. Drag between edge handles to connect cards.</p><p class="muted">Middle-drag empty space to select cards. Hold Ctrl, ⌘, or Shift to add to the selection. Drag a selected card to move them together.</p>';
      return;
    }
    const count = `${selectedNodes.size} card${selectedNodes.size === 1 ? '' : 's'}${selectedEdges.size ? ` · ${selectedEdges.size} connection${selectedEdges.size === 1 ? '' : 's'}` : ''} selected`;
    if (!selectedNodes.size && selectedEdges.size === 1) {
      const edge = canvas.edges.find(e => selectedEdges.has(e.id));
      inspector.innerHTML = `<form id="edge-editor"><p class="selection-count">1 connection selected</p><div class="field"><label for="f-edge-label">Name</label><input id="f-edge-label" value="${esc(edge.label || '')}" placeholder="Optional connection name"/></div><p class="muted">Leave blank to remove the name.</p><div class="actions"><button id="apply" type="submit" title="Apply (Ctrl/Cmd+S)" aria-keyshortcuts="Control+s Meta+s">Apply</button><button id="delete" type="button" class="danger">Delete</button></div></form>`;
      $('edge-editor').onsubmit = event => {
        event.preventDefault();
        const label = $('f-edge-label').value.trim();
        applyEditor(() => {
          if (label) edge.label = label;
          else delete edge.label;
        });
      };
      $('delete').onclick = deleteSelection;
      return;
    }
    if (selectedNodes.size !== 1 || selectedEdges.size) {
      inspector.innerHTML = `<p class="selection-count">${count}</p><p class="muted">Drag a selected card to move the selection. Delete removes selected objects and connections attached to removed cards.</p><button id="delete" class="danger">Delete selection</button>`;
      $('delete').onclick = deleteSelection;
      return;
    }
    const n = node([...selectedNodes][0]);
    const sections = [...new Set([...SECTIONS, 'Custom', n.section || 'Custom'])];
    const statuses = [...new Set(['draft', 'ready', 'blocked', n.status || 'draft'])];
    inspector.innerHTML = `<form id="card-editor"><p class="selection-count">${count}</p><div class="field-row"><div class="field"><label for="f-section">Section / type</label><select id="f-section">${sections.map(s => `<option ${s === (n.section || 'Custom') ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div><div class="field"><label for="f-status">Status</label><select id="f-status">${statuses.map(s => `<option ${s === (n.status || 'draft') ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div></div><div class="field-row"><div class="field"><label for="f-width">Width</label><input id="f-width" type="number" min="${Math.min(n.width, MIN_WIDTH)}" step="any" required value="${n.width}"/></div><div class="field"><label for="f-height">Height</label><input id="f-height" type="number" min="${Math.min(n.height, MIN_HEIGHT)}" step="any" required value="${n.height}"/></div></div><div class="field core-field"><label for="f-body">Markdown</label><textarea id="f-body" spellcheck="false" placeholder="# Title\n\nWrite your Markdown here…">${esc(n.text)}</textarea></div><details><summary>Source details</summary><div class="field"><label for="f-path">Repository path</label><input id="f-path" value="${esc(n.path || '')}"/></div><div class="field"><label for="f-anchor">Anchor</label><input id="f-anchor" value="${esc(n.anchor || '')}"/></div></details><div class="actions"><button id="apply" type="submit" title="Apply (Ctrl/Cmd+S)" aria-keyshortcuts="Control+s Meta+s">Apply</button><button id="delete" type="button" class="danger">Delete</button></div></form>`;
    $('card-editor').onsubmit = event => {
      event.preventDefault();
      const values = { section: $('f-section').value, status: $('f-status').value,
        text: $('f-body').value, width: $('f-width').valueAsNumber, height: $('f-height').valueAsNumber,
        path: $('f-path').value, anchor: $('f-anchor').value };
      applyEditor(() => Object.assign(n, values));
    };
    $('delete').onclick = deleteSelection;
  }
  function startGesture(event, data) {
    event.preventDefault();
    viewport.focus({ preventScroll: true });
    gesture = { pointerId: event.pointerId, start: point(event), moved: false, ...data };
    viewport.setPointerCapture(event.pointerId);
  }
  function handleAt(event) {
    const el = document.elementFromPoint(event.clientX, event.clientY)?.closest('.handle');
    if (!el || !viewport.contains(el)) return null;
    return { id: el.closest('.card').dataset.id, side: el.dataset.side, el };
  }
  function connectable(target) {
    return target && G.canConnect(canvas.edges, gesture.from, gesture.side, target.id, target.side);
  }
  viewport.addEventListener('pointerdown', event => {
    if (gesture || !event.isPrimary) return;
    const target = event.target, card = target.closest('.card'), handle = target.closest('.handle');
    const edge = target.closest('[data-edge-id]');
    if (event.button === 1) {
      if (card || edge || target.closest('button, input, textarea, select')) return;
      startGesture(event, { kind: 'marquee', additive: additive(event), initialSelection: new Set(selectedNodes) });
      viewport.classList.add('selecting');
      return;
    }
    if (event.button !== 0) return;
    if (target.closest('.resize-handle')) {
      const n = node(card.dataset.id);
      if (selectedNodes.size !== 1 || !selectedNodes.has(n.id) || selectedEdges.size) {
        selectedNodes = new Set([n.id]); selectedEdges.clear(); updateSelection();
      }
      startGesture(event, { kind: 'resize', before: snapshot(), id: n.id, width: n.width, height: n.height });
      viewport.classList.add('resizing');
      return;
    }
    if (handle) {
      startGesture(event, { kind: 'connect', from: card.dataset.id, side: handle.dataset.side });
      viewport.classList.add('connecting');
      return;
    }
    // Body scrolling, text selection, and editor controls never move cards.
    if (target.closest('.body, button, input, textarea, select, a')) {
      if (card && additive(event)) {
        const id = card.dataset.id;
        selectedNodes.has(id) ? selectedNodes.delete(id) : selectedNodes.add(id);
        selectedEdges.clear(); updateSelection();
      } else if (card && !selectedNodes.has(card.dataset.id)) {
        selectedNodes = new Set([card.dataset.id]); selectedEdges.clear(); updateSelection();
      }
      return;
    }
    if (card) {
      const id = card.dataset.id;
      if (additive(event)) {
        selectedNodes.has(id) ? selectedNodes.delete(id) : selectedNodes.add(id);
        selectedEdges.clear(); updateSelection(); event.preventDefault(); return;
      }
      if (!selectedNodes.has(id)) { selectedNodes = new Set([id]); selectedEdges.clear(); updateSelection(); }
      startGesture(event, { kind: 'move', before: snapshot(), positions: [...selectedNodes].map(id => ({ id, x: node(id).x, y: node(id).y })) });
      return;
    }
    if (edge) {
      const id = edge.dataset.edgeId;
      if (additive(event)) selectedEdges.has(id) ? selectedEdges.delete(id) : selectedEdges.add(id);
      else { selectedNodes.clear(); selectedEdges = new Set([id]); }
      updateSelection(); event.preventDefault(); return;
    }
    startGesture(event, { kind: 'pan', initialPan: { ...pan } });
    viewport.classList.add('panning');
  });
  function moveGesture(event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.start.x, dy = event.clientY - gesture.start.y;
    if (Math.hypot(dx, dy) >= 4) gesture.moved = true;
    if (gesture.kind === 'move' && gesture.moved) {
      for (const p of gesture.positions) Object.assign(node(p.id), { x: p.x + dx / scale, y: p.y + dy / scale });
      updatePositions();
    } else if (gesture.kind === 'resize' && gesture.moved) {
      Object.assign(node(gesture.id), { width: Math.max(MIN_WIDTH, gesture.width + dx / scale),
        height: Math.max(MIN_HEIGHT, gesture.height + dy / scale) });
      updatePositions();
      updateSizeFields(node(gesture.id));
    } else if (gesture.kind === 'pan' && gesture.moved) {
      pan = { x: gesture.initialPan.x + dx, y: gesture.initialPan.y + dy }; updateTransform();
    } else if (gesture.kind === 'marquee') {
      const box = G.bounds(gesture.start, point(event)), rect = viewport.getBoundingClientRect();
      Object.assign(marquee.style, { left: box.x - rect.left + 'px', top: box.y - rect.top + 'px', width: box.width + 'px', height: box.height + 'px' });
      marquee.classList.remove('hidden');
    } else if (gesture.kind === 'connect') {
      for (const el of viewport.querySelectorAll('.connection-target')) el.classList.remove('connection-target');
      const target = handleAt(event), validTarget = connectable(target);
      if (validTarget) target.el.classList.add('connection-target');
      const a = G.anchor(node(gesture.from), gesture.side);
      const b = validTarget ? G.anchor(node(target.id), target.side) : worldPoint(event);
      previewPath.setAttribute('d', G.curve(a, gesture.side, b, validTarget ? target.side : 'left'));
      previewPath.classList.remove('hidden');
    }
  }
  function clearGesture() {
    const previous = gesture;
    gesture = null;
    viewport.classList.remove('panning', 'selecting', 'connecting', 'resizing');
    marquee.classList.add('hidden');
    previewPath?.classList.add('hidden');
    for (const el of viewport.querySelectorAll('.connection-target')) el.classList.remove('connection-target');
    if (previous && viewport.hasPointerCapture(previous.pointerId)) viewport.releasePointerCapture(previous.pointerId);
    return previous;
  }
  function cancelGesture(event) {
    if (!gesture) return;
    if (event && typeof event.pointerId === 'number' && event.pointerId !== gesture.pointerId) return;
    const previous = clearGesture();
    if (previous.kind === 'move') {
      for (const p of previous.positions) Object.assign(node(p.id), { x: p.x, y: p.y });
      updatePositions();
    } else if (previous.kind === 'resize') {
      Object.assign(node(previous.id), { width: previous.width, height: previous.height });
      updatePositions();
      updateSizeFields(node(previous.id));
    } else if (previous.kind === 'pan') { pan = previous.initialPan; updateTransform(); }
  }
  function finishGesture(event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    moveGesture(event);
    const target = gesture.kind === 'connect' ? handleAt(event) : null;
    const allowed = gesture.kind === 'connect' && connectable(target);
    const previous = clearGesture();
    if (previous.kind === 'move' || previous.kind === 'resize') {
      if (previous.before.contents !== JSON.stringify(canvas)) { remember(previous.before); scheduleSave(); }
    } else if (previous.kind === 'pan' && !previous.moved) {
      selectedNodes.clear(); selectedEdges.clear(); updateSelection();
    } else if (previous.kind === 'marquee') {
      const rect = viewport.getBoundingClientRect(), screenBox = G.bounds(previous.start, point(event));
      if (screenBox.width < 4 || screenBox.height < 4) return;
      const box = G.bounds(G.screenToWorld(previous.start, rect, pan, scale), worldPoint(event));
      const shown = canvas.nodes.filter(visible);
      selectedNodes = G.combineSelection(previous.initialSelection, G.enclosed(shown, box), shown.map(n => n.id), previous.additive);
      selectedEdges.clear(); updateSelection();
    } else if (previous.kind === 'connect' && allowed) {
      commit(() => canvas.edges.push({ id: uid('edge'), fromNode: previous.from, fromSide: previous.side, toNode: target.id, toSide: target.side }));
    }
  }
  viewport.addEventListener('pointermove', moveGesture);
  viewport.addEventListener('pointerup', finishGesture);
  viewport.addEventListener('pointercancel', cancelGesture);
  viewport.addEventListener('lostpointercapture', cancelGesture);
  viewport.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); });
  function updateSizeFields(n) {
    if ($('f-width')) $('f-width').value = n.width;
    if ($('f-height')) $('f-height').value = n.height;
  }
  viewport.addEventListener('keydown', event => {
    const handle = event.target.closest('.resize-handle');
    if (!handle || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const id = handle.closest('.card').dataset.id, n = node(id), step = event.shiftKey ? 1 : 10;
    commit(() => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') n.width = Math.max(MIN_WIDTH, n.width + (event.key === 'ArrowRight' ? step : -step));
      else n.height = Math.max(MIN_HEIGHT, n.height + (event.key === 'ArrowDown' ? step : -step));
    });
    cardElements.get(id).querySelector('.resize-handle').focus({ preventScroll: true });
  });
  window.addEventListener('blur', cancelGesture);
  viewport.addEventListener('wheel', event => {
    if (event.target.closest('.body')) return;
    event.preventDefault();
    if (gesture) return;
    const rect = viewport.getBoundingClientRect();
    const next = Math.max(.45, Math.min(2, scale * (event.deltaY < 0 ? 1.08 : .92)));
    pan = G.zoomPan({ x: event.clientX - rect.left, y: event.clientY - rect.top }, pan, scale, next);
    scale = next; updateTransform();
  }, { passive: false });

  // Save immutable committed payloads: an earlier debounce must never save an in-progress drag.
  function scheduleSave() {
    clearTimeout(saveTimer);
    pendingPayload = JSON.stringify(canvas, null, 2) + '\n';
    revision += 1;
    saveState.textContent = 'Unsaved changes';
    saveTimer = setTimeout(flushSave, 450);
  }
  function flushSave() {
    clearTimeout(saveTimer);
    if (pendingPayload === null) return saveChain;
    const payload = pendingPayload, queuedRevision = revision;
    pendingPayload = null;
    saveChain = saveChain.catch(() => {}).then(async () => {
      valid(JSON.parse(payload));
      if (window.canvasHost?.writeCanvas) await window.canvasHost.writeCanvas(window.canvasPath || '.canvas', payload);
      else if (/^https?:$/.test(window.location.protocol)) {
        const response = await fetch('/api/canvas', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: payload });
        if (!response.ok) throw Error((await response.json()).error || `Save failed (${response.status})`);
      } else {
        window.parent.postMessage({ type: 'canvas:save', payload: { path: window.canvasPath || '.canvas', contents: payload } }, '*');
        saveState.textContent = 'Preview only'; return;
      }
      if (queuedRevision === revision) saveState.textContent = 'Saved';
    }).catch(error => {
      if (queuedRevision === revision) { pendingPayload = payload; saveState.textContent = 'Save error'; }
      notify(error.message);
    });
    return saveChain;
  }
  function notify(message) {
    saveState.title = message;
    window.canvasHost?.notify?.({ type: 'canvas:error', payload: { message } });
  }
  function addCard() {
    const p = G.screenToWorld({ x: viewport.getBoundingClientRect().left + 120, y: viewport.getBoundingClientRect().top + 100 }, viewport.getBoundingClientRect(), pan, scale);
    commit(() => {
      const n = { id: uid('node'), type: 'text', ...p, width: 280, height: 190, color: '1', text: '# New idea\n\nDescribe the claim or experiment.', section: 'Custom', status: 'draft', path: '', anchor: '' };
      canvas.nodes.push(n); selectedNodes = new Set([n.id]); selectedEdges.clear();
    });
  }
  $('add').onclick = addCard;
  $('empty-add').onclick = addCard;
  $('undo').onclick = undo;
  $('redo').onclick = redo;
  $('search').oninput = event => { cancelGesture(); filter = event.target.value.toLowerCase(); render(); };
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      const editor = $('card-editor') || $('edge-editor');
      if (editor) editor.requestSubmit();
      flushSave();
      return;
    }
    if (event.key === 'Escape') { cancelGesture(); return; }
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); cancelGesture(); deleteSelection(); }
    else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
  });
  window.addEventListener('beforeunload', event => {
    if (['move', 'resize'].includes(gesture?.kind) && gesture.moved || pendingPayload !== null || saveState.textContent === 'Unsaved changes') {
      event.preventDefault(); event.returnValue = '';
    }
  });
  function load(c, path = '.canvas') {
    const checked = valid(c);
    cancelGesture(); canvas = checked; window.canvasPath = path; $('path').textContent = path;
    history = []; future = []; updateHistory(); render();
  }
  window.addEventListener('message', event => {
    const m = event.data;
    if (m?.type === 'canvas:init') {
      try { load(typeof m.payload.contents === 'string' ? JSON.parse(m.payload.contents) : m.payload, m.payload.path || '.canvas'); }
      catch (error) { notify(error.message); }
    }
  });
  window.researchCanvas = { load, getCanvas: () => canvas, flushSave };
  async function initialize() {
    canvas = seed(); render();
    try {
      let contents;
      if (window.canvasHost?.readCanvas) contents = await window.canvasHost.readCanvas(window.canvasPath || '.canvas');
      else if (/^https?:$/.test(window.location.protocol)) {
        const response = await fetch('/api/canvas', { cache: 'no-store' });
        if (!response.ok) throw Error(`Load failed (${response.status})`);
        contents = await response.text();
      }
      if (contents) { load(typeof contents === 'string' ? JSON.parse(contents) : contents); saveState.textContent = 'Ready'; }
      else if (!window.canvasHost) saveState.textContent = 'Preview only';
    } catch (error) { saveState.textContent = 'Load error'; notify(error.message); }
  }
  initialize();
}());
