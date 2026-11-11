import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const UPSTREAM = 'https://api.tokenjuice.ai/v1';
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'retry-after', 'x-request-id'];

function firstHeader(value) {
  return Array.isArray(value) ? value[0] : String(value || '').split(',')[0].trim();
}

function isSameOriginRequest(req) {
  const origin = firstHeader(req.headers.origin);
  if (!origin) return true;

  const forwardedHost = firstHeader(req.headers['x-forwarded-host']) || firstHeader(req.headers.host);
  if (!forwardedHost) return false;

  try {
    return new URL(origin).host.toLowerCase() === forwardedHost.toLowerCase();
  } catch {
    return false;
  }
}

function sendJson(res, status, payload) {
  if (res.writableEnded) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export function createTokenJuiceHandler(routePath) {
  return async function handler(req, res) {
    if (!isSameOriginRequest(req)) {
      return sendJson(res, 403, { error: { message: 'Cross-origin requests are not allowed.' } });
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Cache-Control', 'no-store');
      return res.end();
    }

    const expectedMethod = routePath === 'models' ? 'GET' : 'POST';
    if (req.method !== expectedMethod) {
      res.setHeader('Allow', `${expectedMethod}, OPTIONS`);
      return sendJson(res, 405, { error: { message: 'Method not allowed.' } });
    }

    const authorization = firstHeader(req.headers.authorization);
    if (!authorization || !/^Bearer\\s+\\S+/i.test(authorization)) {
      return sendJson(res, 401, { error: { message: 'A Bearer API key is required.' } });
    }

    const incomingUrl = new URL(req.url || '/', 'http://localhost');
    const upstreamUrl = new URL(`${UPSTREAM}/${routePath}`);
    upstreamUrl.search = incomingUrl.search;

    const headers = new Headers({
      Authorization: authorization,
      Accept: firstHeader(req.headers.accept) || 'application/json, text/event-stream'
    });
    const contentType = firstHeader(req.headers['content-type']);
    if (contentType) headers.set('Content-Type', contentType);

    try {
      const upstream = await fetch(upstreamUrl, {
        method: req.method,
        headers,
        body: req.method === 'POST' ? req : undefined,
        ...(req.method === 'POST' ? { duplex: 'half' } : {}),
        redirect: 'manual'
      });

      res.statusCode = upstream.status;
      for (const name of FORWARDED_RESPONSE_HEADERS) {
        const value = upstream.headers.get(name);
        if (value) res.setHeader(name, value);
      }
      res.setHeader('Cache-Control', 'no-store, no-transform');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Vary', 'Origin');
      res.flushHeaders?.();

      if (!upstream.body) return res.end();
      await pipeline(Readable.fromWeb(upstream.body), res);
    } catch (error) {
      if (res.headersSent) {
        res.destroy(error);
        return;
      }
      sendJson(res, 502, {
        error: { message: 'TokenJuice upstream request failed. Check the provider status and try again.' }
      });
    }
  };
}
