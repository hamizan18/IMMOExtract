import express from 'express';

const port = Number(process.env.PORT || 3000);
const aiServiceUrl = new URL(process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000');
const aiTimeoutMs = Number(process.env.AI_HEALTH_TIMEOUT_MS || 3000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
if (!Number.isSafeInteger(aiTimeoutMs) || aiTimeoutMs < 1) {
  throw new Error('AI_HEALTH_TIMEOUT_MS must be a positive integer.');
}
if (!['http:', 'https:'].includes(aiServiceUrl.protocol)) {
  throw new Error('AI_SERVICE_URL must use HTTP or HTTPS.');
}

const app = express();
app.disable('x-powered-by');

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', service: 'backend' });
});

app.get('/api/health/ai', async (_request, response) => {
  try {
    const upstream = await fetch(new URL('/health', aiServiceUrl), {
      signal: AbortSignal.timeout(aiTimeoutMs),
      redirect: 'error',
    });
    if (!upstream.ok) throw new Error('AI health returned a non-success response');
    const health = await upstream.json();
    if (health.status !== 'ok' || health.service !== 'ai-service' || health.model_loaded !== false) {
      throw new Error('AI health returned an unexpected M1 response');
    }
    response.json({ status: 'ok', service: 'ai-service', model_loaded: false });
  } catch (error) {
    console.error('AI health check failed:', error.name);
    response.status(503).json({
      status: 'unavailable',
      service: 'ai-service',
      message: 'Layanan AI tidak dapat dihubungi atau health check gagal.',
    });
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log('IMMOExtract backend listening on http://127.0.0.1:' + port);
});
