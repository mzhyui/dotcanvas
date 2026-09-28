'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { seedCanvas, validateCanvas, serializeCanvas, parseCanvas } = require('../src/model');

test('seed contains the five paper sections', () => {
  const canvas = seedCanvas();
  assert.deepEqual(canvas.nodes.map(n => n.section), ['Introduction', 'Related Work', 'Method', 'Evaluation', 'Conclusion']);
});

test('serialization round trip preserves supported fields', () => {
  const canvas = seedCanvas();
  canvas.edges.push({ id: 'edge-1', fromNode: 'node-1', toNode: 'node-3', fromSide: 'right', toSide: 'left', label: 'supports' });
  assert.deepEqual(parseCanvas(serializeCanvas(canvas)), canvas);
});

test('invalid edge endpoints are rejected', () => {
  assert.throws(() => validateCanvas({ nodes: [], edges: [{ id: 'e', fromNode: 'x', toNode: 'y' }] }), /missing node/);
});

test('duplicate node ids are rejected', () => {
  const canvas = seedCanvas();
  canvas.nodes[1].id = canvas.nodes[0].id;
  assert.throws(() => validateCanvas(canvas), /duplicate/);
});
