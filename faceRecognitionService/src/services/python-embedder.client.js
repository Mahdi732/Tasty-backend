import { ApiError } from '../utils/api-error.js';
import { ERROR_CODES } from '../constants/errors.js';

export class PythonEmbedderClient {
  constructor({ baseUrl, timeoutMs = 8000 }) {
    this.baseUrl = baseUrl;
    this.timeoutMs = timeoutMs;
  }

  async extractEmbedding(imageBuffer) {
    const form = new FormData();
    const imageBlob = new Blob([imageBuffer], { type: 'application/octet-stream' });
    form.append('image_file', imageBlob, 'face-image.jpg');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/embed`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new ApiError(
          502,
          ERROR_CODES.EMBEDDING_PROVIDER_FAILED,
          'Embedding provider returned an error response',
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        502,
        ERROR_CODES.EMBEDDING_PROVIDER_FAILED,
        'Embedding provider request failed',
        String(error)
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  async health() {
    const response = await fetch(`${this.baseUrl}/health`, { method: 'GET' });
    if (!response.ok) {
      return { ok: false };
    }
    return response.json();
  }
}
