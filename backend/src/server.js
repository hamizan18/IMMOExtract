import { createApp } from './app.js';

const port = Number(process.env.PORT || 3000);
const aiServiceUrl = new URL(process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000');
const aiTimeoutMs = Number(process.env.AI_HEALTH_TIMEOUT_MS || 30000);
const aiStylizationTimeoutMs = Number(process.env.AI_STYLIZATION_TIMEOUT_MS || 900000);
const aiStylizationServiceUrl = new URL(process.env.AI_STYLIZATION_SERVICE_URL || aiServiceUrl);
const storageRetentionHours = process.env.STORAGE_RETENTION_HOURS !== undefined
  && process.env.STORAGE_RETENTION_HOURS !== ''
  ? Number(process.env.STORAGE_RETENTION_HOURS) : 24;
const storageSweepIntervalMinutes = process.env.STORAGE_SWEEP_INTERVAL_MINUTES !== undefined
  && process.env.STORAGE_SWEEP_INTERVAL_MINUTES !== ''
  ? Number(process.env.STORAGE_SWEEP_INTERVAL_MINUTES) : 60;

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}
if (!Number.isSafeInteger(aiTimeoutMs) || aiTimeoutMs < 1) {
  throw new Error('AI_HEALTH_TIMEOUT_MS must be a positive integer.');
}
if (!['http:', 'https:'].includes(aiServiceUrl.protocol)) {
  throw new Error('AI_SERVICE_URL must use HTTP or HTTPS.');
}
if (!Number.isSafeInteger(aiStylizationTimeoutMs)
    || aiStylizationTimeoutMs < 1 || aiStylizationTimeoutMs > 2147483647) {
  throw new Error('AI_STYLIZATION_TIMEOUT_MS must be an integer between 1 and 2147483647.');
}
if (!['http:', 'https:'].includes(aiStylizationServiceUrl.protocol)) {
  throw new Error('AI_STYLIZATION_SERVICE_URL must use HTTP or HTTPS.');
}
if (!Number.isSafeInteger(storageRetentionHours) || storageRetentionHours < 0) {
  throw new Error('STORAGE_RETENTION_HOURS must be a non-negative integer.');
}
const retentionMs = storageRetentionHours * 60 * 60 * 1000;
if (retentionMs > 0 && retentionMs <= aiStylizationTimeoutMs) {
  throw new Error('STORAGE_RETENTION_HOURS must exceed AI_STYLIZATION_TIMEOUT_MS when enabled.');
}
if (!Number.isSafeInteger(storageSweepIntervalMinutes) || storageSweepIntervalMinutes < 0) {
  throw new Error('STORAGE_SWEEP_INTERVAL_MINUTES must be a non-negative integer.');
}
const sweepIntervalMs = storageSweepIntervalMinutes * 60 * 1000;

const app = createApp({
  aiServiceUrl,
  aiTimeoutMs,
  aiStylizationTimeoutMs,
  aiStylizationServiceUrl,
  uploadDir: process.env.UPLOAD_DIR,
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024),
  retentionMs,
  sweepIntervalMs,
});

app.listen(port, '127.0.0.1', () => {
  console.log('IMMOExtract backend listening on http://127.0.0.1:' + port);
});
