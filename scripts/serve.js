'use strict';

const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { parseCanvas, seedCanvas, serializeCanvas } = require('../src/model');

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const ASSETS = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/geometry.js': ['geometry.js', 'text/javascript; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/icon.svg': ['icon.svg', 'image/svg+xml']
};

function parseArgs(args) {
  const options = { port: 38473 };
  for (let i = 0; i < args.length; i += 2) {
    if (!['--root', '--port'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) {
      throw new Error('Usage: --root <paper-repository> [--port <port>]');
    }
    options[args[i].slice(2)] = args[i + 1];
  }
  if (!options.root) throw new Error('A paper repository is required: --root <paper-repository>');
  if (!/^\d+$/.test(String(options.port)) || Number(options.port) > 65535) {
    throw new Error('Port must be an integer from 0 to 65535.');
  }
  options.port = Number(options.port);
  return options;
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    function failed(error) { server.removeListener('listening', ready); reject(error); }
    function ready() { server.removeListener('error', failed); resolve(); }
    server.once('error', failed);
    server.once('listening', ready);
    server.listen(port, '127.0.0.1');
  });
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; connect-src 'self'; img-src 'self'; script-src 'self'; style-src 'self'"
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > MAX_BODY_BYTES) {
      const error = new Error('Canvas exceeds the 2 MiB limit.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function createServer(root) {
  const paperRoot = fs.realpathSync(root);
  if (!fs.statSync(paperRoot).isDirectory()) throw new Error('Paper root must be a directory.');
  const canvasPath = path.join(paperRoot, '.canvas');
  const panelRoot = path.resolve(__dirname, '..', 'panel');
  // Freeze assets and identity together so an old process cannot claim a new build.
  const assets = new Map(Object.values(ASSETS).map(([name]) => [name, fs.readFileSync(path.join(panelRoot, name))]));
  const hash = crypto.createHash('sha256');
  for (const [name, contents] of assets) hash.update(name).update(contents);
  for (const name of ['scripts/serve.js', 'scripts/open.js', 'src/model.js', '.codex-plugin/plugin.json']) {
    hash.update(name).update(fs.readFileSync(path.resolve(__dirname, '..', name)));
  }
  const identity = { service: 'dotcanvas', protocol: 1, root: paperRoot, canvasPath,
    version: JSON.parse(fs.readFileSync(path.resolve(__dirname, '../.codex-plugin/plugin.json'))).version,
    build: hash.digest('hex'), pid: process.pid };
  let initialized = false;

  async function readCanvas() {
    try {
      const info = await fsp.lstat(canvasPath);
      if (info.isSymbolicLink()) throw new Error('Canvas path must not be a symbolic link.');
      const contents = await fsp.readFile(canvasPath, 'utf8');
      return serializeCanvas(parseCanvas(contents));
    } catch (error) {
      if (error.code === 'ENOENT') {
        const temporary = path.join(paperRoot, '.canvas.init-' + crypto.randomUUID());
        try {
          await fsp.writeFile(temporary, serializeCanvas(seedCanvas()), { flag: 'wx', mode: 0o600 });
          // Atomic create-if-absent; another opener or editor may win the race.
          await fsp.link(temporary, canvasPath);
          initialized = true;
        } catch (createError) {
          if (createError.code !== 'EEXIST') throw createError;
        } finally {
          await fsp.rm(temporary, { force: true });
        }
        return readCanvas();
      }
      throw error;
    }
  }

  async function writeCanvas(contents) {
    const normalized = serializeCanvas(parseCanvas(contents));
    const temporary = path.join(paperRoot, '.canvas.tmp-' + process.pid + '-' + crypto.randomBytes(8).toString('hex'));
    try {
      await fsp.writeFile(temporary, normalized, { flag: 'wx', mode: 0o600 });
      await fsp.rename(temporary, canvasPath);
    } finally {
      await fsp.rm(temporary, { force: true });
    }
  }

  async function health() {
    const canvas = JSON.parse(await readCanvas());
    return { ...identity, ready: true, initialized, nodes: canvas.nodes.length, edges: canvas.edges.length };
  }

  const server = http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname === '/api/canvas' && req.method === 'GET') {
        send(res, 200, await readCanvas());
      } else if (pathname === '/api/canvas' && req.method === 'PUT') {
        await writeCanvas(await readBody(req));
        send(res, 200, JSON.stringify({ saved: true }));
      } else if (pathname === '/health' && req.method === 'GET') {
        send(res, 200, JSON.stringify(await health()));
      } else if (Object.hasOwn(ASSETS, pathname) && req.method === 'GET') {
        const [filename, type] = ASSETS[pathname];
        send(res, 200, assets.get(filename), type);
      } else {
        send(res, 404, JSON.stringify({ error: 'Not found.' }));
      }
    } catch (error) {
      const status = error.status || (error instanceof SyntaxError || /Canvas|Node|Edge|Unsupported/.test(error.message) ? 400 : 500);
      send(res, status, JSON.stringify({ error: status === 500 ? 'Canvas request failed.' : error.message }));
    }
  });
  server.identity = identity;
  server.health = health;
  return server;
}

if (require.main === module) {
  (async () => {
    const { root, port } = parseArgs(process.argv.slice(2));
    const server = createServer(root);
    await server.health();
    await listen(server, port);
    console.log('DotCanvas ready on http://127.0.0.1:' + server.address().port);
  })().catch(error => {
    console.error(error.code === 'EADDRINUSE'
      ? 'DotCanvas: port is occupied. Use scripts/open.js to reuse a matching server or choose a free port.'
      : 'DotCanvas: ' + error.message);
    process.exitCode = 1;
  });
}

module.exports = { createServer, listen, parseArgs };
