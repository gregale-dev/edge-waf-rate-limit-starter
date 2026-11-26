import http from 'node:http';

const MAX_BODY_BYTES = 64 * 1024;

const SAMPLE_CATALOG = [
  { id: 'vm-small', ram_mb: 512, description: 'MicroVM small tier, scale-to-zero' },
  { id: 'vm-medium', ram_mb: 1024, description: 'MicroVM medium tier, scale-to-zero' },
  { id: 'pg-managed', postgres_major: 17, description: 'Managed PostgreSQL with PITR' },
];

function sendJson(res, status, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

async function readJsonBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      const err = new Error('request_body_too_large');
      err.status = 413;
      throw err;
    }
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const err = new Error('invalid_json');
    err.status = 400;
    throw err;
  }
}

export function createServer(options = {}) {
  const demoUser = options.demoUser || 'alice';
  const demoPass = options.demoPass || 'demo-pass-change-me';

  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://localhost');

      if (req.method === 'GET' && url.pathname === '/healthz') {
        return sendJson(res, 200, { ok: true });
      }

      if (req.method === 'GET' && url.pathname === '/catalog') {
        return sendJson(
          res,
          200,
          { items: SAMPLE_CATALOG },
          { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' }
        );
      }

      if (req.method === 'GET' && url.pathname === '/search') {
        const q = (url.searchParams.get('q') || '').trim().toLowerCase();
        const matches = SAMPLE_CATALOG.filter(
          (item) => !q || item.id.includes(q) || item.description.toLowerCase().includes(q)
        );
        return sendJson(res, 200, { query: q, count: matches.length, items: matches });
      }

      if (req.method === 'POST' && url.pathname === '/login') {
        const body = await readJsonBody(req);
        const username = String(body.username || req.headers['x-username'] || '').trim();
        const password = String(body.password || '');
        if (!username || username !== demoUser || password !== demoPass) {
          // Pairs with `--throttle-key-by composite --throttle-key-field ip --throttle-key-field header:x-username --throttle-count-status 401`
          return sendJson(res, 401, { error: 'invalid_credentials' });
        }
        return sendJson(res, 200, { ok: true, user: username });
      }

      return sendJson(res, 404, { error: 'not_found' });
    } catch (err) {
      return sendJson(res, err.status || 500, { error: err.message || 'internal_error' });
    }
  });
}
