'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../panel/geometry');

test('side anchors use exact saved bounds, including negative coordinates', () => {
  const n = { x: -100, y: 20, width: 240, height: 180 };
  assert.deepEqual(G.SIDES.map(s => G.anchor(n, s)), [
    { x: 20, y: 20 }, { x: 140, y: 110 }, { x: 20, y: 200 }, { x: -100, y: 110 }
  ]);
});
test('coordinate conversion includes viewport offset, pan and zoom', () => {
  assert.deepEqual(G.screenToWorld({ x: 500, y: 274 }, { left: 300, top: 54 }, { x: 20, y: -20 }, 2), { x: 90, y: 120 });
});
test('pointer-centered zoom preserves the same world point', () => {
  const p = { x: 300, y: 200 }, pan = { x: -80, y: 50 };
  const next = G.zoomPan(p, pan, .6, 1.9);
  const a = G.screenToWorld(p, { left: 0, top: 0 }, pan, .6);
  const b = G.screenToWorld(p, { left: 0, top: 0 }, next, 1.9);
  assert.ok(Math.abs(a.x - b.x) < 1e-10 && Math.abs(a.y - b.y) < 1e-10);
});
test('marquee selects only fully enclosed cards in either direction', () => {
  const nodes = [{ id: 'inside', x: 10, y: 10, width: 20, height: 20 }, { id: 'partial', x: 30, y: 30, width: 20, height: 20 }];
  for (const points of [[{ x: 0, y: 0 }, { x: 40, y: 40 }], [{ x: 40, y: 40 }, { x: 0, y: 0 }]]) {
    assert.deepEqual(G.enclosed(nodes, G.bounds(...points)), ['inside']);
  }
});
test('additive marquee selection prunes hidden cards and retains visible selection', () => {
  assert.deepEqual([...G.combineSelection(['a', 'hidden'], ['b'], ['a', 'b'], true)], ['a', 'b']);
  assert.deepEqual([...G.combineSelection(['a'], [], ['a', 'b'], false)], []);
});
test('connections reject self-links and exact duplicates but allow distinct sides', () => {
  const edges = [{ fromNode: 'a', fromSide: 'right', toNode: 'b', toSide: 'left' }];
  assert.equal(G.canConnect(edges, 'a', 'right', 'b', 'left'), false);
  assert.equal(G.canConnect(edges, 'a', 'top', 'b', 'bottom'), true);
  assert.equal(G.canConnect(edges, 'a', 'right', 'a', 'left'), false);
  assert.equal(G.canConnect(edges, 'a', 'bad', 'b', 'left'), false);
});
test('all side combinations produce curves ending at the requested anchors', () => {
  for (const a of G.SIDES) for (const b of G.SIDES) {
    assert.match(G.curve({ x: 10, y: 20 }, a, { x: 300, y: 400 }, b), /^M 10 20 C .*, 300 400$/);
  }
});
