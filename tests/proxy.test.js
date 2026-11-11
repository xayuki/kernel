import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough, Readable } from 'node:stream';
import handler from '../api/tokenjuice/[...path].js';

function makeRequest({ method = 'POST', path = ['chat', 'completions'], origin = 'https://kernel.example', host = 'kernel.example', body = '{"model":"test"}', authorization = 'Bearer test-key' } = {}) {
  const req = Readable.from(method === 'GET' || method === 'OPTIONS' ? [] : [Buffer.from(body)]);
  req.method = method;
  req.url = `/api/tokenjuice/${Array.isArray(path) ? path.join('/') : path}`;
  req.query = { path };
  req.headers = { origin, host, authorization, accept: 'text/event-stream', 'content-type': 'application/json' };
  return req;
}

function makeResponse() {
  const res = new PassThrough();
  res.headers = {};
  res.setHeader = (name, value) => { res.headers[name.toLowerCase()] = value; };
  res.flushHeaders = () => {};
  res.text = () => new Promise((resolve, reject) => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    res.on('error', reject);
  });
  return res;
}

test('rejects cross-origin requests', async () => {
  const res = makeResponse();
  await handler(makeRequest({ origin: 'https://attacker.example' }), res);
  assert.equal(res.statusCode, 403);
  assert.match(await res.text(), /Cross-origin/);
});

test('rejects paths outside the fixed allowlist', async () => {
  const res = makeResponse();
  await handler(makeRequest({ path: ['admin', 'secrets'] }), res);
  assert.equal(res.statusCode, 404);
});

test('rejects wrong methods for a supported route', async () => {
  const res = makeResponse();
  await handler(makeRequest({ method: 'GET', path: ['chat', 'completions'] }), res);
  assert.equal(res.statusCode, 405);
});

test('forwards auth and streams the upstream response', async () => {
  const originalFetch = globalThis.fetch;
  let forwardedAuthorization = '';
  let forwardedUrl = '';
  let forwardedBody = '';
  globalThis.fetch = async (url, init) => {
    forwardedUrl = String(url);
    forwardedAuthorization = init.headers.get('authorization');
    if (init.body) {
      const chunks = [];
      for await (const chunk of init.body) chunks.push(Buffer.from(chunk));
      forwardedBody = Buffer.concat(chunks).toString('utf8');
    }
    return new Response('data: {"choices":[{"delta":{"content":"hello"}}]}\n\n', {
      status: 200,
      headers: { 'content-type': 'text/event-stream' }
    });
  };

  try {
    const res = makeResponse();
    await handler(makeRequest(), res);
    assert.equal(res.statusCode, 200);
    assert.equal(forwardedUrl, 'https://api.tokenjuice.ai/v1/chat/completions');
    assert.equal(forwardedAuthorization, 'Bearer test-key');
    assert.equal(forwardedBody, '{"model":"test"}');
    assert.match(res.headers['content-type'], /text\/event-stream/);
    assert.match(await res.text(), /hello/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
