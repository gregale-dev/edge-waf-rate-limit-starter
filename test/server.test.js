import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../src/app.js';

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

describe('edge-waf-rate-limit-starter HTTP endpoints', () => {
  let server;
  let baseUrl;

  beforeEach(async () => {
    server = createServer({ demoUser: 'alice', demoPass: 's3cr3t' });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
  });

  afterEach(async () => {
    await new Promise((resolve) => server.close(resolve));
  });

  it('serves /healthz and cacheable /catalog', async () => {
    const health = await fetch(`${baseUrl}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true });

    const catalog = await fetch(`${baseUrl}/catalog`);
    assert.equal(catalog.status, 200);
    assert.match(catalog.headers.get('cache-control') || '', /max-age=60/);
    const data = await catalog.json();
    assert.ok(Array.isArray(data.items) && data.items.length >= 3);
  });

  it('filters /search queries and returns 401 on invalid /login', async () => {
    const search = await fetch(`${baseUrl}/search?q=microvm`);
    assert.equal(search.status, 200);
    const matches = await search.json();
    assert.equal(matches.count, 2);

    const badLogin = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Username': 'alice' },
      body: JSON.stringify({ username: 'alice', password: 'wrong' }),
    });
    assert.equal(badLogin.status, 401);

    const okLogin = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'alice', password: 's3cr3t' }),
    });
    assert.equal(okLogin.status, 200);
    assert.deepEqual(await okLogin.json(), { ok: true, user: 'alice' });
  });
});

describe('edge trace, rule, and budget JSON fixtures', () => {
  it('validates all trace scenarios against v1 trace format', () => {
    const tracesDir = path.join(ROOT_DIR, 'traces');
    const files = fs.readdirSync(tracesDir).filter((f) => f.endsWith('.json'));
    assert.ok(files.length >= 4);

    const allowedTop = new Set(['version', 'project', 'environment', 'app', 'request']);
    const allowedReq = new Set(['url', 'method', 'headers', 'client_ip', 'country', 'asn', 'body', 'body_base64']);

    for (const file of files) {
      const parsed = JSON.parse(fs.readFileSync(path.join(tracesDir, file), 'utf8'));
      assert.equal(parsed.version, 1, `${file}: version must be 1`);
      assert.equal(typeof parsed.app, 'string', `${file}: app must be string`);
      assert.ok(parsed.request && typeof parsed.request.url === 'string', `${file}: request.url required`);
      for (const k of Object.keys(parsed)) {
        assert.ok(allowedTop.has(k), `${file}: unexpected top-level key ${k}`);
      }
      for (const k of Object.keys(parsed.request)) {
        assert.ok(allowedReq.has(k), `${file}: unexpected request key ${k}`);
      }
      if (parsed.request.headers !== undefined) {
        assert.ok(Array.isArray(parsed.request.headers), `${file}: headers must be array`);
      }
    }
  });

  it('validates rule create specs and budget.json', () => {
    const rulesDir = path.join(ROOT_DIR, 'rules');
    const files = fs.readdirSync(rulesDir).filter((f) => f.endsWith('.json'));
    assert.ok(files.length >= 3);

    for (const file of files) {
      const rule = JSON.parse(fs.readFileSync(path.join(rulesDir, file), 'utf8'));
      assert.equal(rule.match_host, '@app', `${file}: security rules should target @app`);
      assert.ok(rule.kind && rule.action?.[rule.kind], `${file}: kind and action[kind] required`);
    }

    const budget = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'budget.json'), 'utf8'));
    assert.equal(budget.action, 'stop_previews');
    assert.equal(budget.currency, 'USD');
    assert.ok(budget.limit_millicents > 0);
  });
});
