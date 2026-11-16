import 'dotenv/config';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { analyzeIntent } from '../prompts/intentAnalyzer.js';
import { generateValidatedUI } from '../prompts/generationWorkflow.js';

const MAX_BODY = 16 * 1024;
const MAX_REPAIRS = 2;

export function createApp({ generate = createLLMAdapter() } = {}) {
  return createServer(async (req, res) => {
    const send = (status, data) => {
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        'access-control-allow-origin': process.env.AURAGEN_CORS_ORIGIN || 'http://localhost:5173',
        'vary': 'Origin',
      });
      res.end(JSON.stringify(data));
    };
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': process.env.AURAGEN_CORS_ORIGIN || 'http://localhost:5173',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
      });
      return res.end();
    }
    const path = new URL(req.url || '/', 'http://localhost').pathname;
    if (req.method === 'GET' && path === '/api/health') return send(200, { status: 'ok', service: 'auragen-backend' });
    if (req.method !== 'POST' || !['/api/analyze', '/api/generate'].includes(path)) return send(404, { error: 'NOT_FOUND' });
    if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return send(415, { error: 'UNSUPPORTED_MEDIA_TYPE' });
    let raw = '';
    try {
      for await (const chunk of req) {
        raw += chunk.toString('utf8');
        if (Buffer.byteLength(raw) > MAX_BODY) return send(413, { error: 'BODY_TOO_LARGE' });
      }
      let body;
      try { body = JSON.parse(raw); } catch { return send(400, { error: 'INVALID_JSON' }); }
      if (!body || typeof body !== 'object' || Array.isArray(body) || typeof body.request !== 'string' || !body.request.trim() || body.request.length > 5000) {
        return send(400, { error: 'INVALID_REQUEST', message: 'request must be a nonempty string of at most 5000 characters' });
      }
      if (path === '/api/analyze') return send(200, analyzeIntent(body.request));
      const result = await generateValidatedUI(body.request, generate, { maxRepairs: MAX_REPAIRS });
      return send(result.valid ? 200 : 422, result);
    } catch (error) {
      if (error instanceof TypeError || error instanceof RangeError) return send(400, { error: 'INVALID_REQUEST', message: error.message });
      console.error('AuraGen request failure:', error.message);
      return send(502, { error: 'GENERATION_FAILED', message: 'Generation provider unavailable or returned an invalid response' });
    }
  });
}

export function createLLMAdapter({ apiKey = process.env.OPENAI_API_KEY, model = process.env.AURAGEN_MODEL || 'gpt-4o-mini', mock = process.env.AURAGEN_MOCK === '1' } = {}) {
  if (mock) return async (messages) => {
    const request = messages.findLast((message) => message.role === 'user')?.content || 'UI preview';
    return JSON.stringify({
      componentName: 'GeneratedUI',
      explanation: 'Deterministic mock preview; no LLM was called.',
      code: `export default function GeneratedUI() { return <main><h1>AuraGen mock preview</h1><p>{${JSON.stringify(String(request).slice(0, 200))}}</p></main>; }`,
    });
  };
  return async (messages) => {
    if (!apiKey) throw new Error('OPENAI_API_KEY is not configured. Set it or enable AURAGEN_MOCK=1 for local tests.');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model, messages, temperature: 0.2, response_format: { type: 'json_object' } }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Provider HTTP ${response.status}`);
      const payload = await response.json();
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string') throw new Error('Provider response missing message content');
      return content;
    } finally { clearTimeout(timeout); }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 8000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1..65535');
  createApp().listen(port, '127.0.0.1', () => console.log(`AuraGen API listening at http://127.0.0.1:${port}`));
}
