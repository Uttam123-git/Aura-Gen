import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp, createLLMAdapter } from '../src/server/index.js';

async function withServer(generate, fn) {
  const server = createApp({ generate });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve())); }
}
const post = (base, path, body, contentType = 'application/json') => fetch(`${base}${path}`, {
  method: 'POST', headers: { 'content-type': contentType }, body: typeof body === 'string' ? body : JSON.stringify(body),
});

test('health endpoint reports service status', async () => {
  await withServer(createLLMAdapter({ mock: true }), async base => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).status, 'ok');
  });
});
test('analyze endpoint resolves intent', async () => {
  await withServer(createLLMAdapter({ mock: true }), async base => {
    const response = await post(base, '/api/analyze', { request: 'Create a three-step registration form' });
    assert.equal(response.status, 200);
    assert.ok((await response.json()).components.includes('Stepper'));
  });
});
test('generate endpoint returns validated mock response', async () => {
  await withServer(createLLMAdapter({ mock: true }), async base => {
    const response = await post(base, '/api/generate', { request: 'A simple welcome page' });
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.equal(result.valid, true);
    assert.equal(result.output.componentName, 'GeneratedUI');
  });
});
test('rejects malformed JSON, missing requests, and wrong content type', async () => {
  await withServer(createLLMAdapter({ mock: true }), async base => {
    assert.equal((await post(base, '/api/generate', '{bad')).status, 400);
    assert.equal((await post(base, '/api/generate', {})).status, 400);
    assert.equal((await post(base, '/api/generate', 'hello', 'text/plain')).status, 415);
  });
});
test('reports validation failure when provider always produces invalid output', async () => {
  await withServer(async () => '{bad', async base => {
    const response = await post(base, '/api/generate', { request: 'Create a form' });
    const result = await response.json();
    assert.equal(response.status, 422);
    assert.equal(result.valid, false);
    assert.equal(result.attempts.length, 3);
  });
});
test('repairs invalid output using another provider response', async () => {
  let count = 0;
  const mock = createLLMAdapter({ mock: true });
  await withServer(async messages => (++count === 1 ? '{bad' : mock(messages)), async base => {
    const response = await post(base, '/api/generate', { request: 'A welcome page' });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).attempts.length, 2);
  });
});
