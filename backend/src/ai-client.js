/**
 * IMMOExtract — AI Service HTTP Client.
 *
 * Communicates with the FastAPI local AI service running on loopback.
 * Handles health probes and image extraction via path or multipart.
 */

export class AiClient {
  constructor({
    aiServiceUrl = new URL('http://127.0.0.1:8000'),
    timeoutMs = 30000,
  } = {}) {
    this.aiServiceUrl = aiServiceUrl instanceof URL ? aiServiceUrl : new URL(aiServiceUrl);
    this.timeoutMs = timeoutMs;
  }

  /**
   * Probes /health on the AI service.
   * @returns {Promise<{ status: string, service: string, model_loaded: boolean }>}
   */
  async health() {
    const url = new URL('/health', this.aiServiceUrl);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(Math.min(this.timeoutMs, 5000)),
      redirect: 'error',
    });
    if (!response.ok) {
      throw new Error(`AI health check failed with HTTP ${response.status}`);
    }
    const data = await response.json();
    if (data.status !== 'ok' || data.service !== 'ai-service' || typeof data.model_loaded !== 'boolean') {
      throw new Error('AI health check returned an invalid response structure');
    }
    return data;
  }

  /**
   * Requests extraction using local disk file paths (fastest for co-located service).
   */
  async extractPath({ imagePath, outputPath, saveMaskPath, objectsDir, includeBase64 = false }) {
    const url = new URL('/extract-path', this.aiServiceUrl);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_path: imagePath,
        output_path: outputPath,
        save_mask_path: saveMaskPath,
        objects_dir: objectsDir,
        include_base64: includeBase64,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
      redirect: 'error',
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const error = new Error(errBody.detail || `AI extraction failed with HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  /**
   * Requests extraction via HTTP multipart file upload.
   */
  async extractMultipart({
    buffer,
    filename = 'image.png',
    mimeType = 'image/png',
    outputPath,
    saveMaskPath,
    objectsDir,
    includeBase64 = false,
  }) {
    const url = new URL('/extract', this.aiServiceUrl);
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mimeType }), filename);
    if (outputPath) form.append('output_path', outputPath);
    if (saveMaskPath) form.append('save_mask_path', saveMaskPath);
    if (objectsDir) form.append('objects_dir', objectsDir);
    form.append('include_base64', includeBase64 ? 'true' : 'false');

    const response = await fetch(url, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(this.timeoutMs),
      redirect: 'error',
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const error = new Error(errBody.detail || `AI extraction failed with HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }
}
