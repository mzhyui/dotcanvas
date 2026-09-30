'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../scripts/serve');
const { seedCanvas } = require('../src/model');

test('local bridge loads, validates, and atomically saves a canvas', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dotcanvas-test-'));
  const server = createServer(root);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    await fs.rm(root, { recursive: true, force: true });
  });
  const base = 'http://127.0.0.1:' + server.address().port;

  const initial = await fetch(base + '/api/canvas');
  assert.equal(initial.status, 200);
  assert.equal((await initial.json()).nodes.length, 5);

  const canvas = seedCanvas();
  canvas.nodes[0].text = '# Updated introduction';
  const saved = await fetch(base + '/api/canvas', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(canvas)
  });
  assert.equal(saved.status, 200);
  assert.equal(JSON.parse(await fs.readFile(path.join(root, '.canvas'), 'utf8')).nodes[0].text, '# Updated introduction');

  canvas.edges.push({ id: 'bad', fromNode: 'missing', toNode: 'node-1' });
  const rejected = await fetch(base + '/api/canvas', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(canvas)
  });
  assert.equal(rejected.status, 400);
  assert.equal(JSON.parse(await fs.readFile(path.join(root, '.canvas'), 'utf8')).nodes[0].text, '# Updated introduction');
  assert.equal((await fetch(base + '/app.js')).status, 200);
  assert.equal((await fetch(base + '/geometry.js')).status, 200);
  assert.equal((await fetch(base + '/vendor/markdown-it.min.js')).status, 200);
  const icon = await fetch(base + '/assets/icon.svg');
  assert.equal(icon.status, 200);
  assert.equal(icon.headers.get('content-type'), 'image/svg+xml');
  const expectedIcon = await fs.readFile(path.resolve(__dirname, '../assets/icon.svg'), 'utf8');
  assert.equal(await icon.text(), expectedIcon);
  assert.equal(await (await fetch(base + '/icon.svg')).text(), expectedIcon);
  assert.equal((await fetch(base + '/../src/model.js')).status, 404);
});
