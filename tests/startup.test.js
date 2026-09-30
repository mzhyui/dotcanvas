'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const exec = promisify(execFile);
const { ensureServer, probe } = require('../scripts/open');
const { seedCanvas } = require('../src/model');
const { createServer, listen } = require('../scripts/serve');
const launcher = path.resolve(__dirname, '../scripts/open.js');
const foreground = path.resolve(__dirname, '../scripts/serve.js');

async function rootFor(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'dotcanvas-startup-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
async function close(server) {
  if (!server?.listening) return;
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}
async function open(t, root, port = 0) {
  const result = await ensureServer(root, { port });
  if (result.server) t.after(() => close(result.server));
  return result;
}
async function occupy(t, handler = (_req, res) => res.end('{"ready":true}')) {
  const server = http.createServer(handler);
  await listen(server, 0);
  t.after(() => close(server));
  return server;
}

test('startup initializes once, identifies the loaded build, and preserves existing bytes', async t => {
  const root = await rootFor(t);
  const first = await open(t, root);
  assert.equal(first.details.initialized, true);
  assert.equal(first.details.nodes, 5);
  assert.equal(first.details.root, await fs.realpath(root));
  assert.equal(first.details.service, 'dotcanvas');
  assert.match(first.details.build, /^[a-f0-9]{64}$/);
  const file = path.join(root, '.canvas');
  const custom = seedCanvas(); custom.nodes[0].text = '# Preserve my spacing';
  custom.metadata.extra = { retained: true };
  const bytes = JSON.stringify(custom, null, 4) + '\n\n';
  await fs.writeFile(file, bytes);
  const reused = await open(t, root, first.details.port);
  assert.equal(reused.details.reused, true);
  assert.equal(reused.server, null);
  assert.equal(reused.details.pid, first.details.pid);
  assert.equal(await fs.readFile(file, 'utf8'), bytes);
  assert.deepEqual((await fs.readdir(root)), ['.canvas']);
});

test('occupied ports and other repositories are left running; fallback is reused even after preferred port frees', async t => {
  const a = await rootFor(t), b = await rootFor(t);
  const first = await open(t, a);
  const second = await open(t, b, first.details.port);
  assert.notEqual(first.details.port, second.details.port);
  assert.equal((await probe(first.details.port)).root, a);
  await close(first.server);
  const reopened = await open(t, b, first.details.port);
  assert.equal(reopened.details.reused, true);
  assert.equal(reopened.details.port, second.details.port);
});

test('legacy and stale builds are not reused or stopped', async t => {
  const root = await rootFor(t);
  const identity = createServer(root).identity;
  for (const response of [{ ready: true }, { ...identity, ready: true, build: 'old-build' }]) {
    const old = await occupy(t, (_req, res) => res.end(JSON.stringify(response)));
    const current = await open(t, root, old.address().port);
    assert.notEqual(current.details.port, old.address().port);
    assert.equal(old.listening, true);
    assert.deepEqual(await probe(old.address().port), response);
    await close(current.server);
  }
});

test('an unresponsive occupied port has a bounded probe and falls back', { timeout: 4000 }, async t => {
  const root = await rootFor(t);
  const silent = await occupy(t, () => {});
  const start = performance.now();
  const result = await open(t, root, silent.address().port);
  assert.notEqual(result.details.port, silent.address().port);
  assert.ok(performance.now() - start < 3000);
  assert.equal(silent.listening, true);
});

test('concurrent opens converge on one server and do not race canvas initialization', async t => {
  const root = await rootFor(t);
  const blocker = await occupy(t);
  const results = await Promise.all(Array.from({ length: 4 }, () => open(t, root, blocker.address().port)));
  assert.equal(new Set(results.map(r => r.details.port)).size, 1);
  assert.equal(results.filter(r => !r.details.reused).length, 1);
  assert.equal(JSON.parse(await fs.readFile(path.join(root, '.canvas'))).nodes.length, 5);
  assert.deepEqual(await fs.readdir(root), ['.canvas']);
});

test('invalid documents and symlinks fail without replacing or normalizing them', async t => {
  const root = await rootFor(t);
  const file = path.join(root, '.canvas');
  await fs.writeFile(file, '{broken');
  await assert.rejects(ensureServer(root, { port: 0 }), /Canvas JSON is invalid/);
  assert.equal(await fs.readFile(file, 'utf8'), '{broken');
  await fs.unlink(file);
  await fs.symlink('missing-target', file);
  await assert.rejects(ensureServer(root, { port: 0 }), /symbolic link/);
  assert.equal(await fs.readlink(file), 'missing-target');
});

test('health fails for a newly invalid canvas instead of reporting ready', async t => {
  const root = await rootFor(t);
  const { details } = await open(t, root);
  await fs.writeFile(path.join(root, '.canvas'), 'invalid');
  const response = await fetch(details.url + '/health');
  assert.equal(response.status, 400);
  assert.equal(await probe(details.port), null);
});

test('canonical repository aliases reuse the same server', async t => {
  const root = await rootFor(t), parent = await rootFor(t);
  const alias = path.join(parent, 'alias');
  await fs.symlink(root, alias);
  const first = await open(t, root);
  const second = await open(t, alias, first.details.port);
  assert.equal(second.details.reused, true);
  assert.equal(second.details.root, root);
});

test('portable manifest supplies identity without a Codex overlay; running builds keep their assets', async t => {
  const root = await rootFor(t), plugin = await rootFor(t);
  for (const name of ['scripts', 'src', 'panel', 'assets', 'plugin.json']) {
    await fs.cp(path.resolve(__dirname, '..', name), path.join(plugin, name), { recursive: true });
  }
  const { createServer: copiedServer } = require(path.join(plugin, 'scripts/serve.js'));
  const server = copiedServer(root);
  const manifestPath = path.join(plugin, 'plugin.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  assert.equal(server.identity.version, manifest.version);
  await listen(server, 0);
  t.after(() => close(server));
  const asset = path.join(plugin, 'panel/app.js');
  const original = await fs.readFile(asset, 'utf8');
  const build = server.identity.build;
  await fs.appendFile(asset, '\n// changed build\n');
  assert.equal(await (await fetch(`http://127.0.0.1:${server.address().port}/app.js`)).text(), original);
  assert.equal((await server.health()).build, build);
  const assetBuild = copiedServer(root).identity.build;
  assert.notEqual(assetBuild, build);
  manifest.version = '0.0.0-test';
  await fs.writeFile(manifestPath, JSON.stringify(manifest));
  const updated = copiedServer(root).identity;
  assert.equal(updated.version, manifest.version);
  assert.notEqual(updated.build, assetBuild);
  assert.equal((await server.health()).version, server.identity.version);
});

test('CLI exits promptly while detached server survives and later CLI reuses it', { timeout: 10000 }, async t => {
  const root = await rootFor(t);
  const env = { ...process.env, HTTP_PROXY: 'http://127.0.0.1:1', HTTPS_PROXY: 'http://127.0.0.1:1', ALL_PROXY: 'socks5://127.0.0.1:1', NO_PROXY: '' };
  const { stdout, stderr } = await exec(process.execPath, [launcher, '--root', root, '--port', '0'], { timeout: 8000, env });
  const receipt = JSON.parse(stdout);
  t.after(async () => {
    process.kill(receipt.pid, 'SIGTERM');
    for (let i = 0; i < 30 && await probe(receipt.port); i++) await new Promise(resolve => setTimeout(resolve, 20));
  });
  assert.equal(stderr, '');
  assert.equal(receipt.reused, false);
  assert.ok(receipt.elapsedMs < 6000);
  assert.equal((await probe(receipt.port)).pid, receipt.pid);
  const second = await exec(process.execPath, [launcher, '--root', root, '--port', String(receipt.port)], { timeout: 8000, env });
  assert.equal(JSON.parse(second.stdout).reused, true);
  assert.equal(JSON.parse(second.stdout).pid, receipt.pid);
});

test('CLI reports actionable errors without an unhandled-event stack', async t => {
  const root = await rootFor(t);
  const blocker = await occupy(t);
  await assert.rejects(exec(process.execPath, [foreground, '--root', root, '--port', String(blocker.address().port)]), error => {
    assert.match(error.stderr, /port is occupied.*open.js/);
    assert.doesNotMatch(error.stderr, /Unhandled|node:events|at Server/);
    return true;
  });
  for (const args of [[], ['--root', root, '--port'], ['--root', root, '--port', 'oops'], ['--root', root, '--wat', '1']]) {
    await assert.rejects(exec(process.execPath, [launcher, ...args]), error => {
      assert.match(error.stderr, /DotCanvas:/); assert.equal(error.stdout, ''); return true;
    });
  }
  await fs.writeFile(path.join(root, '.canvas'), 'broken');
  await assert.rejects(exec(process.execPath, [launcher, '--root', root]), error => {
    assert.match(error.stderr, /DotCanvas:/); assert.doesNotMatch(error.stderr, /Unhandled/); return true;
  });
  assert.equal(await fs.readFile(path.join(root, '.canvas'), 'utf8'), 'broken');
});
