'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const { fork } = require('node:child_process');
const { createServer, listen, parseArgs } = require('./serve');

const STARTUP_TIMEOUT_MS = 6000;

function candidatePorts(root, preferred) {
  if (preferred === 0) return [0];
  const offset = crypto.createHash('sha256').update(root).digest().readUInt32BE(0) % 20000;
  // Stable fallback ports make repeat/concurrent opens reusable without a registry.
  return [...new Set([preferred, ...Array.from({ length: 12 }, (_, i) => 40000 + (offset + i) % 20000)])];
}

function probe(port) {
  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      req.destroy();
      resolve(value);
    };
    // node:http connects directly to loopback regardless of proxy environment variables.
    const req = http.get({ hostname: '127.0.0.1', port, path: '/health', agent: false }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; if (body.length > 16384) finish(null); });
      res.on('end', () => {
        try { finish(res.statusCode === 200 ? JSON.parse(body) : null); }
        catch { finish(null); }
      });
      res.on('error', () => finish(null));
    });
    const timer = setTimeout(() => finish(null), 250);
    req.on('error', () => finish(null));
  });
}

async function ensureServer(root, { port = 38473 } = {}) {
  const server = createServer(root);
  const health = await server.health();
  const candidates = candidatePorts(health.root, port);
  const matches = existing => existing?.service === 'dotcanvas' && existing.protocol === health.protocol
    && existing.ready === true && existing.root === health.root && existing.build === health.build;
  const reused = (existing, candidate) => ({ server: null, details: {
    ...existing, port: candidate, url: `http://127.0.0.1:${candidate}`, reused: true
  } });
  // Look for a fallback server even if the preferred port has since become free.
  const available = await Promise.all(candidates.map(candidate => candidate ? probe(candidate) : null));
  const found = available.findIndex(matches);
  if (found >= 0) return reused(available[found], candidates[found]);
  for (const candidate of candidates) {
    try {
      await listen(server, candidate);
      const actualPort = server.address().port;
      return { server, details: { ...health, port: actualPort, url: `http://127.0.0.1:${actualPort}`, reused: false } };
    } catch (error) {
      if (error.code !== 'EADDRINUSE') throw error;
      const existing = await probe(candidate);
      if (matches(existing)) return reused(existing, candidate);
    }
  }
  throw new Error('All candidate ports are occupied. Retry with --port 0 for an OS-assigned port.');
}

function launch(args) {
  return new Promise((resolve, reject) => {
    const child = fork(__filename, args, { detached: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    let settled = false;
    const finish = (error, details) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) child.kill(); // Only the process created by this invocation.
      if (child.connected) child.disconnect();
      child.unref();
      if (error) reject(error); else resolve(details);
    };
    const timer = setTimeout(() => finish(new Error('Startup timed out after 6 seconds.')), STARTUP_TIMEOUT_MS);
    child.once('error', error => finish(error));
    child.once('exit', (code, signal) => finish(new Error(`Server exited before readiness (${signal || code}).`)));
    child.once('message', message => finish(message.error ? new Error(message.error) : null, message.details));
  });
}

if (require.main === module) {
  const started = performance.now();
  (async () => {
    const args = process.argv.slice(2);
    const options = parseArgs(args);
    if (process.send) {
      // A parent that disappears before accepting readiness must not leave an orphan.
      let handedOff = false;
      process.once('disconnect', () => { if (!handedOff) process.exit(1); });
      const { details } = await ensureServer(options.root, options);
      process.send({ details }, error => {
        if (error) process.exit(1);
        handedOff = true;
        if (process.connected) process.disconnect();
      });
    } else {
      const details = await launch(args);
      console.log(JSON.stringify({ ...details, elapsedMs: Math.round(performance.now() - started) }));
    }
  })().catch(error => {
    if (process.send && process.connected) {
      process.send({ error: error.message }, () => process.exit(1));
    } else {
      console.error('DotCanvas: ' + error.message);
      process.exitCode = 1;
    }
  });
}

module.exports = { ensureServer, candidatePorts, probe };
