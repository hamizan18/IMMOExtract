import { createApp } from './app.js';

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

const app = createApp({
  aiServiceUrl,
  aiTimeoutMs,
  uploadDir: process.env.UPLOAD_DIR,
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024),
});

app.listen(port, '127.0.0.1', () => {
  console.log('IMMOExtract backend listening on http://127.0.0.1:' + port);
});
