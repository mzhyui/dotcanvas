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

  async function readCanvas() {
    try {
      const info = await fsp.lstat(canvasPath);
      if (info.isSymbolicLink()) throw new Error('Canvas path must not be a symbolic link.');
      const contents = await fsp.readFile(canvasPath, 'utf8');
      return serializeCanvas(parseCanvas(contents));
    } catch (error) {
      if (error.code === 'ENOENT') return serializeCanvas(seedCanvas());
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

  return http.createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname === '/api/canvas' && req.method === 'GET') {
        send(res, 200, await readCanvas());
      } else if (pathname === '/api/canvas' && req.method === 'PUT') {
        await writeCanvas(await readBody(req));
        send(res, 200, JSON.stringify({ saved: true }));
      } else if (pathname === '/health' && req.method === 'GET') {
        send(res, 200, JSON.stringify({ ready: true }));
      } else if (Object.hasOwn(ASSETS, pathname) && req.method === 'GET') {
        const [filename, type] = ASSETS[pathname];
        send(res, 200, await fsp.readFile(path.join(panelRoot, filename)), type);
      } else {
        send(res, 404, JSON.stringify({ error: 'Not found.' }));
      }
    } catch (error) {
      const status = error.status || (error instanceof SyntaxError || /Canvas|Node|Edge|Unsupported/.test(error.message) ? 400 : 500);
      send(res, status, JSON.stringify({ error: status === 500 ? 'Canvas request failed.' : error.message }));
    }
  });
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const rootIndex = args.indexOf('--root');
  const portIndex = args.indexOf('--port');
  if (rootIndex < 0 || !args[rootIndex + 1]) {
    console.error('Usage: node scripts/serve.js --root <paper-repository> [--port <port>]');
    process.exit(2);
  }
  const port = portIndex < 0 ? 38473 : Number(args[portIndex + 1]);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    console.error('Port must be an integer from 0 to 65535.');
    process.exit(2);
  }
  const server = createServer(args[rootIndex + 1]);
  server.listen(port, '127.0.0.1', () => {
    console.log('DotCanvas ready on http://127.0.0.1:' + server.address().port);
  });
}

module.exports = { createServer };
