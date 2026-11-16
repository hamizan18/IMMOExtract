import assert from 'node:assert/strict';

const backend = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
const frontend = process.env.FRONTEND_URL || 'http://127.0.0.1:5173';
const ai = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const unavailable = process.argv.includes('--ai-unavailable');

async function check(base, path, status, expected) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(10000) });
  assert.equal(response.status, status, base + path);
  const json = await response.json();
  if (path === '/health' || path === '/api/health/ai') {
    if (status === 200) {
      assert.equal(json.status, 'ok', base + path);
      assert.equal(json.service, 'ai-service', base + path);
      assert.equal(typeof json.model_loaded, 'boolean', base + path);
      console.log('PASS', status, base + path, `(model_loaded: ${json.model_loaded})`);
      return;
    }
  }
  assert.deepEqual(json, expected, base + path);
  console.log('PASS', status, base + path);
}

const backendHealth = { status: 'ok', service: 'backend' };
const aiHealth = { status: 'ok', service: 'ai-service', model_loaded: false };
const aiError = {
  status: 'unavailable',
  service: 'ai-service',
  message: 'Layanan AI tidak dapat dihubungi atau health check gagal.',
};

if (!unavailable) await check(ai, '/health', 200, aiHealth);
for (const base of [backend, frontend]) {
  await check(base, '/api/health', 200, backendHealth);
  await check(base, '/api/health/ai', unavailable ? 503 : 200, unavailable ? aiError : aiHealth);
  await check(base, '/api/health', 200, backendHealth);
}
console.log('M1 smoke PASS (' + (unavailable ? 'AI unavailable' : 'all services running') + ')');
