// Static SPA host + tiny JSON key/value store. No deps.
//   GET  /api/state       -> { key: stringValue, ... }
//   PUT  /api/state/:key  -> body = string value; writes $DATA_DIR/<key>.json
//   GET  /healthz
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || '/data';
const DIST = process.env.DIST_DIR || '/app/dist';
const KEY_RE = /^underplan_[a-z_]+$/;
const MAX_BODY = 20 * 1024 * 1024;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };

await fs.mkdir(DATA_DIR, { recursive: true });

const send = (res, code, body, type = 'text/plain') => { res.writeHead(code, { 'content-type': type }); res.end(body); };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/healthz') return send(res, 200, 'ok');
    if (url.pathname === '/api/state' && req.method === 'GET') {
      const out = {};
      for (const f of await fs.readdir(DATA_DIR)) {
        if (!f.endsWith('.json')) continue;
        const key = f.slice(0, -5);
        if (KEY_RE.test(key)) out[key] = await fs.readFile(path.join(DATA_DIR, f), 'utf8');
      }
      return send(res, 200, JSON.stringify(out), 'application/json');
    }
    const m = url.pathname.match(/^\/api\/state\/([^/]+)$/);
    if (m && req.method === 'PUT') {
      if (!KEY_RE.test(m[1])) return send(res, 400, 'bad key');
      let size = 0; const chunks = [];
      for await (const c of req) { size += c.length; if (size > MAX_BODY) return send(res, 413, 'too large'); chunks.push(c); }
      const tmp = path.join(DATA_DIR, `.${m[1]}.tmp`);
      await fs.writeFile(tmp, Buffer.concat(chunks));
      await fs.rename(tmp, path.join(DATA_DIR, `${m[1]}.json`));
      return send(res, 204, '');
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method not allowed');
    let file = path.join(DIST, path.normalize(url.pathname).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(DIST)) return send(res, 403, 'forbidden');
    const st = await fs.stat(file).catch(() => null);
    if (!st || st.isDirectory()) file = path.join(DIST, 'index.html');
    const buf = await fs.readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  } catch (e) { console.error(e); send(res, 500, 'error'); }
}).listen(PORT, () => console.log(`underplan on :${PORT}, data=${DATA_DIR}`));
