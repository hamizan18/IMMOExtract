import express from 'express';
import { AiClient } from './ai-client.js';
import { createExtractionRouter } from './extractions.js';
import { createUploadRouter } from './uploads.js';
import { createJobRouter } from './jobs.js';

export function createApp({
  aiServiceUrl = new URL('http://127.0.0.1:8000'),
  aiTimeoutMs = 30000,
  aiStylizationTimeoutMs = 900000,
  aiStylizationServiceUrl = aiServiceUrl,
  aiClient,
  uploadDir,
  jobDir,
  maxUploadBytes = 10 * 1024 * 1024,
} = {}) {
  const app = express();
  app.disable('x-powered-by');

  const client = aiClient || new AiClient({
    aiServiceUrl,
    timeoutMs: aiTimeoutMs,
    stylizationTimeoutMs: aiStylizationTimeoutMs,
    stylizationServiceUrl: aiStylizationServiceUrl,
  });

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', service: 'backend' });
  });

  app.get('/api/health/ai', async (_request, response) => {
    try {
      const health = await client.health();
      response.json({
        status: 'ok',
        service: 'ai-service',
        model_loaded: health.model_loaded,
      });
    } catch (error) {
      console.error('AI health check failed:', error.name || error.message);
      response.status(503).json({
        status: 'unavailable',
        service: 'ai-service',
        message: 'Layanan AI tidak dapat dihubungi atau health check gagal.',
      });
    }
  });

  app.use('/api/uploads', createUploadRouter({ uploadDir, maxUploadBytes }));
  app.use('/api/uploads', createExtractionRouter({ uploadDir, aiClient: client }));
  app.use('/api/jobs', createJobRouter({ uploadDir, jobDir, maxUploadBytes, aiClient: client }));

  return app;
}
